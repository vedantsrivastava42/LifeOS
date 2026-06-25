/**
 * Shared server-side derivations: live streak, XP totals, target progress.
 * These read from the ledgers/logs and compute — they never trust a stored
 * aggregate. Single-user scale, so in-memory summation is fine.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isStreakConfig,
  isTargetConfig,
  type QuestItemRow,
  type QuestRow,
} from "@/lib/domain/types";
import { computeStreak, type StreakResult } from "@/lib/domain/streak";
import { levelFromXp } from "@/lib/domain/xp";
import { weekdayOf, weeksElapsed, type DateStr } from "@/lib/domain/dates";
import type { StreakView, TargetProgressView } from "@/lib/api/types";

export async function getLogDates(
  supabase: SupabaseClient,
  questId: string,
): Promise<DateStr[]> {
  const { data } = await supabase
    .from("day_logs")
    .select("log_date")
    .eq("quest_id", questId);
  return (data ?? []).map((r) => r.log_date as string);
}

export function liveStreak(
  quest: QuestRow,
  logDates: DateStr[],
  today: DateStr,
): StreakResult {
  const cfg = isStreakConfig(quest.config) ? quest.config : null;
  return computeStreak(logDates, cfg, today, quest.start_date);
}

export function toStreakView(s: StreakResult): StreakView {
  return {
    current: s.current_streak,
    longest: s.longest_streak,
    freezes: s.freezes_available,
    last_active_date: s.last_active_date,
    needs_welcome_back: s.needs_welcome_back,
  };
}

export async function questXpTotal(
  supabase: SupabaseClient,
  questId: string,
): Promise<number> {
  const { data } = await supabase
    .from("xp_events")
    .select("amount")
    .eq("quest_id", questId);
  return (data ?? []).reduce((s, r) => s + (r.amount as number), 0);
}

export async function lifetimeXp(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("xp_events")
    .select("amount")
    .eq("user_id", userId);
  return (data ?? []).reduce((s, r) => s + (r.amount as number), 0);
}

export async function questTodayXp(
  supabase: SupabaseClient,
  questId: string,
  date: DateStr,
): Promise<number> {
  const { data } = await supabase
    .from("xp_events")
    .select("amount")
    .eq("quest_id", questId)
    .eq("event_date", date);
  return (data ?? []).reduce((s, r) => s + (r.amount as number), 0);
}

/** Gentle pace assessment for a target quest. Never alarming. */
export function targetProgress(
  quest: QuestRow,
  doneCount: number,
  today: DateStr,
): TargetProgressView | undefined {
  if (!isTargetConfig(quest.config)) return undefined;
  const { target_count, pace_per_week } = quest.config;
  // Weeks fully elapsed (0 during the first week → never "behind" on day one).
  const weeks = weeksElapsed(quest.start_date, today);
  const expected = Math.min(target_count, pace_per_week * weeks);
  let pace: TargetProgressView["pace"] = "on";
  if (weeks > 0) {
    if (doneCount >= expected + pace_per_week * 0.5) pace = "ahead";
    else if (doneCount < expected - pace_per_week * 0.5) pace = "behind";
  }
  return {
    done: doneCount,
    target: target_count,
    pace_per_week,
    expected_by_now: expected,
    pace,
    percent:
      target_count > 0
        ? Math.min(100, Math.round((doneCount / target_count) * 100))
        : 0,
  };
}

export function isRestToday(quest: QuestRow, today: DateStr): boolean {
  if (!isStreakConfig(quest.config)) return false;
  return (quest.config.rest_days ?? []).includes(weekdayOf(today));
}

export function countDone(items: QuestItemRow[], kinds: string[]): number {
  return items.filter((i) => i.is_done && kinds.includes(i.kind)).length;
}

export { levelFromXp };
