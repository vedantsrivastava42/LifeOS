import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CategoryRow,
  QuestConfig,
  QuestItemRow,
  QuestRow,
  SheetItemRow,
  TargetConfig,
  TopicSchedule,
} from "@/lib/domain/types";
import {
  assignDailyCounts,
  assignItemDueDates,
  buildTopicSchedule,
  generateContests,
  weekdaysForCadence,
} from "@/lib/domain/schedule";
import type {
  CreateQuestInput,
  RescheduleInput,
} from "@/lib/validation/schemas";
import type { QuestSummary } from "@/lib/api/types";
import {
  countDone,
  getLogDates,
  isRestToday,
  liveStreak,
  questTodayXp,
  questXpTotal,
  targetProgress,
  toStreakView,
} from "@/lib/server/compute";
import type { DateStr } from "@/lib/domain/dates";

interface TopicPlanResult {
  orderedItems: SheetItemRow[];
  dueDates: (string | null)[];
  leftovers: SheetItemRow[];
  slices: TopicSchedule[];
}

/**
 * Build a topic-sequenced plan from a sheet's items. Topics are taken in the
 * given order; each contributes up to `count` of its problems at its own pace.
 * Returns the scheduled problems (topic-major) with per-item due dates, the
 * unscheduled remainder, and the actual per-topic slices (counts clamped to
 * what the sheet actually has).
 */
function buildTopicPlan(
  pool: SheetItemRow[],
  topics: { topic: string; pace_per_week: number; count: number }[],
  start: DateStr,
  activeWeekdays: number[],
): TopicPlanResult {
  const byTopic = new Map<string, SheetItemRow[]>();
  for (const si of pool) {
    const key = si.topic ?? "";
    const arr = byTopic.get(key);
    if (arr) arr.push(si);
    else byTopic.set(key, [si]);
  }

  const orderedItems: SheetItemRow[] = [];
  const slices: TopicSchedule[] = [];
  const usedIds = new Set<string>();
  for (const t of topics) {
    const avail = byTopic.get(t.topic) ?? [];
    const count = Math.min(t.count, avail.length);
    if (count <= 0) continue;
    for (const si of avail.slice(0, count)) {
      orderedItems.push(si);
      usedIds.add(si.id);
    }
    slices.push({ topic: t.topic, pace_per_week: t.pace_per_week, count });
  }

  const sched = buildTopicSchedule(start, slices, activeWeekdays);
  const dueDates = orderedItems.map((_, i) => sched[i]?.date ?? null);
  const leftovers = pool.filter((si) => !usedIds.has(si.id));
  return { orderedItems, dueDates, leftovers, slices };
}

/** Create a quest and its initial items/state. Returns the new quest id. */
export async function createQuest(
  supabase: SupabaseClient,
  userId: string,
  input: CreateQuestInput,
): Promise<{ id: string }> {
  // ── Pre-compute the sheet plan (so quest config can store accurate slices) ──
  // pool = sheet items in order; orderedItems/dueDates = the scheduled problems
  // (topic-major when topic-sequenced); leftovers = unscheduled backlog.
  let pool: SheetItemRow[] = [];
  let orderedItems: SheetItemRow[] = [];
  let dueDates: (string | null)[] = [];
  let leftovers: SheetItemRow[] = [];
  let scheduleConfig: TargetConfig["schedule"] | undefined;
  let scheduledTotal = 0;

  if (input.type === "target" && input.attach_sheet && input.sheet_id) {
    const { data: sheetItems } = await supabase
      .from("sheet_items")
      .select("*")
      .eq("sheet_id", input.sheet_id)
      .order("order_index", { ascending: true });
    pool = (sheetItems ?? []) as SheetItemRow[];

    if (input.schedule?.enabled && input.target) {
      const active = weekdaysForCadence(
        input.schedule.cadence,
        input.schedule.custom_weekdays,
      );

      if (input.schedule.topics?.length) {
        // Topic-sequenced: do topics in the chosen order, each at its own pace.
        const plan = buildTopicPlan(pool, input.schedule.topics, input.start_date, active);
        orderedItems = plan.orderedItems;
        dueDates = plan.dueDates;
        leftovers = plan.leftovers;
        scheduledTotal = orderedItems.length;
        scheduleConfig = {
          cadence: input.schedule.cadence,
          active_weekdays: active,
          topics: plan.slices,
        };
      } else {
        // Flat plan: first N sheet items in sheet order, single pace.
        const count = Math.min(input.target.target_count, pool.length);
        orderedItems = pool.slice(0, count);
        leftovers = pool.slice(count);
        const dayPlan = assignDailyCounts(
          input.start_date,
          count,
          input.target.pace_per_week,
          active,
        );
        dueDates = assignItemDueDates(count, dayPlan);
        scheduledTotal = count;
        scheduleConfig = {
          cadence: input.schedule.cadence,
          active_weekdays: active,
        };
      }
    } else {
      // No schedule → copy every sheet item as an untimed backlog.
      leftovers = pool;
    }
  }

  let config: QuestConfig = {};
  if (input.type === "target" && input.target) {
    const cfg: TargetConfig = {
      target_count: scheduledTotal > 0 ? scheduledTotal : input.target.target_count,
      pace_per_week: input.target.pace_per_week,
    };
    if (scheduleConfig) cfg.schedule = scheduleConfig;
    config = cfg;
  } else if (input.type === "streak") {
    const s = input.streak ?? {
      rest_days: [],
      freezes_max: 3,
      freezes_available: 1,
    };
    config = {
      rest_days: s.rest_days,
      freezes_max: s.freezes_max,
      freezes_available: s.freezes_available,
    };
  }

  const { data: quest, error } = await supabase
    .from("quests")
    .insert({
      user_id: userId,
      name: input.name,
      category_id: input.category_id,
      type: input.type,
      start_date: input.start_date,
      end_date: input.end_date ?? null,
      sheet_id: input.sheet_id ?? null,
      status: "active",
      config,
      ai_generated: false,
    })
    .select("*")
    .single();
  if (error || !quest) {
    throw new Error(error?.message ?? "Failed to create quest");
  }

  const items: Partial<QuestItemRow>[] = [];
  let order = 0;

  // Scheduled problems first (topic-major, with due dates), then the untimed
  // backlog (deselected topics / overflow) so everything stays tickable.
  orderedItems.forEach((si, i) => {
    items.push({
      user_id: userId,
      quest_id: quest.id,
      label: si.title,
      source_item_id: si.id,
      topic: si.topic,
      pattern: si.pattern,
      difficulty: si.difficulty,
      due_date: dueDates[i] ?? null,
      kind: "problem",
      order_index: order++,
    });
  });
  leftovers.forEach((si) => {
    items.push({
      user_id: userId,
      quest_id: quest.id,
      label: si.title,
      source_item_id: si.id,
      topic: si.topic,
      pattern: si.pattern,
      difficulty: si.difficulty,
      due_date: null,
      kind: "problem",
      order_index: order++,
    });
  });

  // Deterministically expand contest dates (no LLM).
  if (input.type === "target" && input.contests) {
    const drafts = generateContests(
      input.start_date,
      input.end_date ?? null,
      input.contests,
    );
    for (const d of drafts) {
      items.push({
        user_id: userId,
        quest_id: quest.id,
        label: d.label,
        due_date: d.due_date,
        kind: "contest",
        order_index: order++,
      });
    }
  }

  // Milestone checklist.
  if (input.type === "milestone" && input.milestone_items?.length) {
    for (const label of input.milestone_items) {
      items.push({
        user_id: userId,
        quest_id: quest.id,
        label,
        kind: "checklist",
        order_index: order++,
      });
    }
  }

  if (items.length) {
    const { error: itemErr } = await supabase.from("quest_items").insert(items);
    if (itemErr) throw new Error(itemErr.message);
  }

  // Seed streak state for streak quests.
  if (input.type === "streak") {
    const freezes =
      input.streak?.freezes_available ?? 1;
    await supabase.from("streak_state").insert({
      user_id: userId,
      quest_id: quest.id,
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
      freezes_available: freezes,
    });
  }

  return { id: quest.id };
}

/**
 * Re-plan an existing target quest: reorder topics, retune per-topic pace,
 * change cadence. Only *undone* problems are re-dated (from `start_date`, or
 * today); finished ones keep their dates. Topics not listed (or disabled) have
 * their undone problems moved to the untimed backlog (due_date = null).
 */
export async function rescheduleQuest(
  supabase: SupabaseClient,
  questId: string,
  input: RescheduleInput,
  today: DateStr,
): Promise<{ ok: true; scheduled: number; backlog: number }> {
  const { data: quest } = await supabase
    .from("quests")
    .select("*")
    .eq("id", questId)
    .maybeSingle();
  if (!quest) throw new Error("Quest not found");
  if (quest.type !== "target") {
    throw new Error("Only target quests can be scheduled");
  }

  const active = weekdaysForCadence(input.cadence, input.custom_weekdays);
  const start = input.start_date ?? today;

  const { data: itemsData } = await supabase
    .from("quest_items")
    .select("*")
    .eq("quest_id", questId)
    .eq("kind", "problem")
    .order("order_index", { ascending: true });
  const problems = (itemsData ?? []) as QuestItemRow[];

  // Group the *undone* problems by topic (done ones keep their dates).
  const undoneByTopic = new Map<string, QuestItemRow[]>();
  for (const it of problems) {
    if (it.is_done) continue;
    const key = it.topic ?? "";
    const arr = undoneByTopic.get(key);
    if (arr) arr.push(it);
    else undoneByTopic.set(key, [it]);
  }

  const orderedUndone: QuestItemRow[] = [];
  const slices: TopicSchedule[] = [];
  for (const t of input.topics) {
    if (t.enabled === false) continue;
    const list = undoneByTopic.get(t.topic) ?? [];
    if (!list.length) continue;
    for (const it of list) orderedUndone.push(it);
    slices.push({
      topic: t.topic,
      pace_per_week: t.pace_per_week,
      count: list.length,
    });
  }

  const sched = buildTopicSchedule(start, slices, active);
  const dateByItem = new Map<string, string>();
  orderedUndone.forEach((it, i) => {
    const d = sched[i]?.date;
    if (d) dateByItem.set(it.id, d);
  });

  // Batch the due-date updates by date (few distinct dates → few queries).
  const idsByDate = new Map<string, string[]>();
  for (const [id, date] of dateByItem) {
    const arr = idsByDate.get(date);
    if (arr) arr.push(id);
    else idsByDate.set(date, [id]);
  }
  for (const [date, ids] of idsByDate) {
    await supabase
      .from("quest_items")
      .update({ due_date: date })
      .eq("quest_id", questId)
      .in("id", ids);
  }

  // Undone problems we didn't schedule → untimed backlog.
  const backlogIds = problems
    .filter((it) => !it.is_done && !dateByItem.has(it.id))
    .map((it) => it.id);
  if (backlogIds.length) {
    await supabase
      .from("quest_items")
      .update({ due_date: null })
      .eq("quest_id", questId)
      .in("id", backlogIds);
  }

  // Persist the new schedule shape on the quest config.
  const cfg = { ...(quest.config as Record<string, unknown>) };
  cfg.schedule = {
    cadence: input.cadence,
    active_weekdays: active,
    topics: slices,
  };
  await supabase.from("quests").update({ config: cfg }).eq("id", questId);

  return { ok: true, scheduled: dateByItem.size, backlog: backlogIds.length };
}

export type CategoryLite = Pick<CategoryRow, "id" | "name" | "icon" | "color">;

/** Build the computed summary for one quest (used by Today, list, detail). */
export async function summarizeQuest(
  supabase: SupabaseClient,
  quest: QuestRow,
  category: CategoryLite | null,
  today: DateStr,
): Promise<{ summary: QuestSummary; items: QuestItemRow[]; logDates: DateStr[] }> {
  const { data: itemsData } = await supabase
    .from("quest_items")
    .select("*")
    .eq("quest_id", quest.id)
    .order("order_index", { ascending: true });
  const items = (itemsData ?? []) as QuestItemRow[];

  const logDates = await getLogDates(supabase, quest.id);
  const [xp_total, today_xp] = await Promise.all([
    questXpTotal(supabase, quest.id),
    questTodayXp(supabase, quest.id, today),
  ]);

  const today_logged = logDates.includes(today);
  const rest_today = isRestToday(quest, today);
  const open_items = items.filter((i) => !i.is_done).length;

  const summary: QuestSummary = {
    id: quest.id,
    name: quest.name,
    type: quest.type,
    status: quest.status,
    start_date: quest.start_date,
    end_date: quest.end_date,
    category,
    xp_total,
    today_xp,
    today_logged,
    rest_today,
    due_today: [],
    open_items,
  };

  if (quest.type === "streak") {
    summary.streak = toStreakView(liveStreak(quest, logDates, today));
  } else if (quest.type === "target") {
    const done = countDone(items, ["problem", "custom"]);
    summary.progress = targetProgress(quest, done, today);
    // Everything scheduled for today (assigned problems + contests), undone.
    summary.due_today = items.filter(
      (i) => i.due_date === today && !i.is_done,
    );
  } else if (quest.type === "milestone") {
    summary.checklist = items;
    summary.due_today = items.filter((i) => !i.is_done);
  }

  return { summary, items, logDates };
}

/** Map of categoryId → lite category, including global presets. */
export async function loadCategoryMap(
  supabase: SupabaseClient,
): Promise<Map<string, CategoryLite>> {
  const { data } = await supabase
    .from("categories")
    .select("id, name, icon, color");
  const map = new Map<string, CategoryLite>();
  for (const c of data ?? []) map.set(c.id, c as CategoryLite);
  return map;
}
