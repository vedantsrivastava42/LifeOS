import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isStreakConfig,
  type QuestItemRow,
  type QuestRow,
} from "@/lib/domain/types";
import type { LogInput } from "@/lib/validation/schemas";
import type { LogResult } from "@/lib/api/types";
import {
  scoreItems,
  scoreNote,
  scoreTick,
  levelFromXp,
  type ScorableItem,
  type XpEventDraft,
} from "@/lib/domain/xp";
import { daysBetween, type DateStr } from "@/lib/domain/dates";
import {
  getLogDates,
  liveStreak,
  lifetimeXp,
  toStreakView,
} from "@/lib/server/compute";

/** Consecutive logged days ending at `asOf` (calendar-adjacent). */
function simpleConsecutive(logDates: DateStr[], asOf: DateStr): number {
  const set = new Set(logDates);
  let d = asOf;
  let n = 0;
  while (set.has(d)) {
    n += 1;
    d = shiftBack(d);
  }
  return n;
}
function shiftBack(d: DateStr): DateStr {
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

const nowIso = () => new Date().toISOString();

/**
 * The single write path for engagement. Marks items done, upserts the day_log,
 * recomputes the streak, and appends to the XP ledger — then returns a small
 * "delight" payload for the UI.
 */
export async function logDay(
  supabase: SupabaseClient,
  userId: string,
  quest: QuestRow,
  input: LogInput,
): Promise<LogResult> {
  const today = input.today;
  const logDate = input.date ?? today;
  if (daysBetween(logDate, today) < 0) {
    throw new Error("Can't log a day in the future");
  }
  if (daysBetween(quest.start_date, logDate) < 0) {
    throw new Error("That day is before the quest started");
  }

  const lifetimeBefore = await lifetimeXp(supabase, userId);

  // Existing log for this quest+day (we merge into it).
  const { data: existingLog } = await supabase
    .from("day_logs")
    .select("*")
    .eq("quest_id", quest.id)
    .eq("log_date", logDate)
    .maybeSingle();
  const startIndex: number = existingLog?.item_ids?.length ?? 0;

  const scorables: ScorableItem[] = [];
  const completedItemIds: string[] = [];

  // Daily tasks reset each day: completion is per-day (tracked in the day_log's
  // item_ids), never the permanent is_done flag.
  const isDaily = quest.type === "daily";
  const alreadyToday = new Set<string>(existingLog?.item_ids ?? []);

  if (input.kind === "items") {
    if (input.itemIds?.length) {
      const { data: existItems } = await supabase
        .from("quest_items")
        .select("*")
        .eq("quest_id", quest.id)
        .in("id", input.itemIds);
      const toComplete: string[] = [];
      for (const it of (existItems ?? []) as QuestItemRow[]) {
        completedItemIds.push(it.id);
        if (isDaily) {
          // Award XP once per day; don't permanently complete the task.
          if (!alreadyToday.has(it.id)) {
            scorables.push({
              kind: it.kind,
              difficulty: it.difficulty,
              label: it.label,
              xpOverride: it.xp_value,
            });
          }
        } else if (!it.is_done) {
          // Only newly-completed items earn XP (no double-dipping).
          scorables.push({
            kind: it.kind,
            difficulty: it.difficulty,
            label: it.label,
            xpOverride: it.xp_value,
          });
          toComplete.push(it.id);
        }
      }
      if (toComplete.length) {
        await supabase
          .from("quest_items")
          .update({ is_done: true, done_at: nowIso() })
          .in("id", toComplete);
      }
    }

    if (input.newItems?.length) {
      const { data: maxRow } = await supabase
        .from("quest_items")
        .select("order_index")
        .eq("quest_id", quest.id)
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();
      let order = (maxRow?.order_index ?? -1) + 1;
      const rows = input.newItems.map((ni) => ({
        user_id: userId,
        quest_id: quest.id,
        label: ni.label,
        difficulty: ni.difficulty ?? null,
        topic: ni.topic ?? null,
        kind: ni.kind ?? (quest.type === "milestone" ? "checklist" : "custom"),
        is_done: true,
        done_at: nowIso(),
        order_index: order++,
      }));
      const { data: inserted } = await supabase
        .from("quest_items")
        .insert(rows)
        .select("*");
      for (const it of (inserted ?? []) as QuestItemRow[]) {
        completedItemIds.push(it.id);
        scorables.push({
          kind: it.kind,
          difficulty: it.difficulty,
          label: it.label,
        });
      }
    }
  }

  // Upsert the merged day_log.
  const mergedItemIds = Array.from(
    new Set([...(existingLog?.item_ids ?? []), ...completedItemIds]),
  );
  const logKind =
    input.kind === "items" || completedItemIds.length
      ? "items"
      : existingLog?.kind ?? input.kind;
  const note = input.note?.trim() || existingLog?.note || null;

  if (existingLog) {
    await supabase
      .from("day_logs")
      .update({ kind: logKind, note, item_ids: mergedItemIds })
      .eq("id", existingLog.id);
  } else {
    await supabase.from("day_logs").insert({
      user_id: userId,
      quest_id: quest.id,
      log_date: logDate,
      kind: logKind,
      note,
      item_ids: mergedItemIds,
    });
  }

  // Recompute streak from the full history (now including this day).
  const logDates = await getLogDates(supabase, quest.id);
  const streakRes = liveStreak(quest, logDates, today);

  const { data: prevStreak } = await supabase
    .from("streak_state")
    .select("*")
    .eq("quest_id", quest.id)
    .maybeSingle();
  const prevFreezes =
    prevStreak?.freezes_available ??
    (isStreakConfig(quest.config) ? quest.config.freezes_available : 0);
  // Freezes apply to streak AND target quests (both run the streak engine).
  const usesStreak = quest.type === "streak" || quest.type === "target";
  const freeze_earned =
    usesStreak && streakRes.freezes_available > prevFreezes;

  await supabase.from("streak_state").upsert(
    {
      user_id: userId,
      quest_id: quest.id,
      current_streak: streakRes.current_streak,
      longest_streak: Math.max(
        streakRes.longest_streak,
        prevStreak?.longest_streak ?? 0,
      ),
      last_active_date: streakRes.last_active_date,
      freezes_available: streakRes.freezes_available,
    },
    { onConflict: "quest_id" },
  );

  // Score XP. Streak bonus uses the quest's consecutive-day count.
  const streakForBonus = usesStreak
    ? streakRes.current_streak
    : simpleConsecutive(logDates, logDate);

  const tickBase =
    isStreakConfig(quest.config) && quest.config.tick_xp != null
      ? quest.config.tick_xp
      : undefined;

  let drafts: XpEventDraft[] = [];
  if (input.kind === "tick") {
    if (!existingLog) drafts = [scoreTick(streakForBonus, tickBase)];
  } else if (input.kind === "items") {
    if (scorables.length) {
      drafts = scoreItems(scorables, startIndex, streakForBonus).events;
    }
  } else if (input.kind === "note") {
    if (!existingLog) drafts = [scoreNote()];
  }

  if (drafts.length) {
    await supabase.from("xp_events").insert(
      drafts.map((d) => ({
        user_id: userId,
        quest_id: quest.id,
        event_date: logDate,
        amount: d.amount,
        base_amount: d.base_amount,
        multiplier: d.multiplier,
        reason: d.reason,
      })),
    );
  }

  const xp_gained = drafts.reduce((s, d) => s + d.amount, 0);
  const lifetimeAfter = lifetimeBefore + xp_gained;
  const levelBefore = levelFromXp(lifetimeBefore);
  const levelAfter = levelFromXp(lifetimeAfter);

  // Total XP earned today across all quests (for the Today header).
  const { data: todayRows } = await supabase
    .from("xp_events")
    .select("amount")
    .eq("user_id", userId)
    .eq("event_date", today);
  const today_xp = (todayRows ?? []).reduce(
    (s, r) => s + (r.amount as number),
    0,
  );

  const message =
    xp_gained > 0
      ? `+${xp_gained} XP`
      : input.kind === "tick"
        ? "Already ticked today"
        : "Logged";

  return {
    ok: true,
    xp_gained,
    events: drafts.map((d) => ({ reason: d.reason, amount: d.amount })),
    today_xp,
    lifetime_xp: lifetimeAfter,
    level: levelAfter,
    leveled_up: levelAfter.level > levelBefore.level,
    streak: usesStreak ? toStreakView(streakRes) : undefined,
    freeze_earned,
    message,
  };
}
