import type { SupabaseClient } from "@supabase/supabase-js";
import { isTargetConfig, type QuestRow } from "@/lib/domain/types";
import type { CalendarDay, CalendarResponse } from "@/lib/api/types";
import type { DayStatus } from "@/lib/domain/streak";
import {
  daysBetween,
  monthBounds,
  rangeDays,
  type DateStr,
} from "@/lib/domain/dates";
import { getLogDates, liveStreak, toStreakView } from "@/lib/server/compute";

export async function buildCalendar(
  supabase: SupabaseClient,
  quest: QuestRow,
  month: string,
  today: DateStr,
): Promise<CalendarResponse> {
  const { start, end } = monthBounds(month);
  const scheduled = isTargetConfig(quest.config) && !!quest.config.schedule;

  const { data: logs } = await supabase
    .from("day_logs")
    .select("log_date, note, item_ids")
    .eq("quest_id", quest.id)
    .gte("log_date", start)
    .lte("log_date", end);
  const logByDate = new Map((logs ?? []).map((l) => [l.log_date as string, l]));

  const { data: xpRows } = await supabase
    .from("xp_events")
    .select("event_date, amount")
    .eq("quest_id", quest.id)
    .gte("event_date", start)
    .lte("event_date", end);
  const xpByDate = new Map<string, number>();
  for (const r of xpRows ?? []) {
    xpByDate.set(
      r.event_date as string,
      (xpByDate.get(r.event_date as string) ?? 0) + (r.amount as number),
    );
  }

  // Scheduled problems planned per day (the day's goal).
  const plannedByDate = new Map<string, number>();
  if (scheduled) {
    const { data: due } = await supabase
      .from("quest_items")
      .select("due_date, kind")
      .eq("quest_id", quest.id)
      .in("kind", ["problem", "custom"])
      .gte("due_date", start)
      .lte("due_date", end);
    for (const it of due ?? []) {
      const d = it.due_date as string | null;
      if (d) plannedByDate.set(d, (plannedByDate.get(d) ?? 0) + 1);
    }
  }

  // Full-history streak pass for non-scheduled quests' per-day annotations.
  const allLogDates = await getLogDates(supabase, quest.id);
  const streakRes = liveStreak(quest, allLogDates, today);

  const days: CalendarDay[] = rangeDays(start, end).map((date) => {
    const log = logByDate.get(date);
    const loggedCount = (log?.item_ids as string[] | undefined)?.length ?? 0;
    const plannedCount = plannedByDate.get(date) ?? 0;

    let status: DayStatus;
    if (daysBetween(quest.start_date, date) < 0) {
      status = "pre";
    } else if (scheduled) {
      // Goal-based coloring: green if you met the day's planned count.
      if (daysBetween(today, date) > 0) {
        status = plannedCount > 0 ? "upcoming" : "off";
      } else if (date === today) {
        // Today turns green once the goal is met, but never amber (not over yet).
        status =
          loggedCount > 0 && loggedCount >= plannedCount ? "met" : "today";
      } else if (plannedCount === 0) {
        status = loggedCount > 0 ? "met" : "off";
      } else {
        status = loggedCount >= plannedCount ? "met" : "missed";
      }
    } else if (daysBetween(today, date) > 0) {
      status = "future";
    } else {
      status = streakRes.day_status[date] ?? "idle";
    }

    return {
      date,
      status,
      logged: !!log,
      note: (log?.note as string) ?? null,
      item_count: loggedCount,
      xp: xpByDate.get(date) ?? 0,
      scheduled_count: plannedCount,
    };
  });

  return {
    month: month.length === 7 ? month : month.slice(0, 7),
    quest_id: quest.id,
    days,
    streak: toStreakView(streakRes),
    scheduled,
  };
}
