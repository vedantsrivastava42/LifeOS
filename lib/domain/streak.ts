/**
 * Anti-anxiety streak engine. Pure, deterministic, server-authoritative.
 *
 * Rules (see lib/config/xp.ts → STREAK_RULES):
 *   • rest_days never count as a break and never require activity.
 *   • Every N consecutive active days earns a freeze (capped at freezes_max).
 *   • A missed non-rest day auto-consumes a freeze instead of breaking.
 *   • With no freezes left, a missed non-rest day causes a *soft* step-down
 *     (−softDecayDaysPerMiss per missed day), not a reset to zero…
 *   • …unless the gap since last activity exceeds longGapDays, in which case
 *     the streak resets to 0 and `needs_welcome_back` is flagged.
 *   • Today is never counted as a miss — the day isn't over yet.
 *
 * The function also returns a per-day status map, which the calendar view uses.
 */
import { STREAK_RULES } from "@/lib/config/xp";
import type { StreakConfig } from "@/lib/domain/types";
import {
  daysBetween,
  rangeDays,
  weekdayOf,
  type DateStr,
} from "@/lib/domain/dates";

export type DayStatus =
  | "active" // logged that day
  | "rest" // a configured rest day with no log
  | "frozen" // a non-rest miss that a freeze absorbed
  | "miss" // an uncovered non-rest miss (streak stepped down)
  | "idle" // a non-rest empty day before the first activity (harmless)
  | "today" // today, not yet logged — neutral, never a miss
  | "future" // after today
  | "pre" // before the quest start date
  // ── scheduled (target-quest) day statuses ──
  | "met" // hit the day's planned goal (green)
  | "missed" // a past planned day whose goal wasn't met (amber)
  | "upcoming" // a future planned day
  | "off"; // a non-planned day (no goal) — neutral

export interface StreakResult {
  current_streak: number;
  longest_streak: number;
  last_active_date: DateStr | null;
  freezes_available: number;
  needs_welcome_back: boolean;
  /** dateStr → status, for the [start, today] window. */
  day_status: Record<DateStr, DayStatus>;
}

const DEFAULT_CONFIG: StreakConfig = {
  rest_days: [],
  freezes_available: STREAK_RULES.defaultFreezesStart,
  freezes_max: STREAK_RULES.defaultFreezesMax,
};

export function computeStreak(
  activeDates: Iterable<DateStr>,
  config: Partial<StreakConfig> | null | undefined,
  today: DateStr,
  startDate: DateStr,
): StreakResult {
  const cfg = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  const restDays = new Set(cfg.rest_days ?? []);
  const freezesMax = cfg.freezes_max ?? STREAK_RULES.defaultFreezesMax;
  const active = new Set(activeDates);

  const day_status: Record<DateStr, DayStatus> = {};

  // Window we actually simulate: from start to today (clamped so start ≤ today).
  const simStart = daysBetween(startDate, today) < 0 ? today : startDate;

  let current = 0;
  let longest = 0;
  let freezes = Math.min(cfg.freezes_available ?? 0, freezesMax);
  let consecutiveForFreeze = 0; // active days toward the next earned freeze
  let lastActive: DateStr | null = null;
  let streakAtGapStart = 0; // streak value when the current gap began
  let gapMisses = 0; // uncovered misses accumulated in the current gap

  for (const d of rangeDays(simStart, today)) {
    const isActive = active.has(d);
    const isRest = restDays.has(d ? weekdayOf(d) : 0);
    const isToday = d === today;

    if (isActive) {
      current += 1;
      consecutiveForFreeze += 1;
      if (consecutiveForFreeze % STREAK_RULES.freezeEveryNDays === 0) {
        freezes = Math.min(freezes + 1, freezesMax);
      }
      longest = Math.max(longest, current);
      lastActive = d;
      streakAtGapStart = current;
      gapMisses = 0;
      day_status[d] = "active";
      continue;
    }

    if (isRest) {
      // Neutral: doesn't break, doesn't extend.
      day_status[d] = "rest";
      continue;
    }

    if (isToday) {
      // The day isn't over — never penalize today.
      day_status[d] = "today";
      continue;
    }

    if (lastActive === null) {
      // Empty non-rest day before any activity — nothing to break.
      day_status[d] = "idle";
      continue;
    }

    // A genuine miss on a non-rest day.
    if (freezes > 0) {
      freezes -= 1;
      consecutiveForFreeze = 0;
      day_status[d] = "frozen";
      continue;
    }

    // No freeze left → uncovered miss.
    gapMisses += 1;
    consecutiveForFreeze = 0;
    const calendarGap = daysBetween(lastActive, d);
    if (calendarGap > STREAK_RULES.longGapDays) {
      current = 0; // stepped away for too long → reset
    } else {
      current = Math.max(
        0,
        streakAtGapStart - STREAK_RULES.softDecayDaysPerMiss * gapMisses,
      );
    }
    day_status[d] = "miss";
  }

  const trailingGap = lastActive ? daysBetween(lastActive, today) : 0;
  const needs_welcome_back =
    lastActive !== null && trailingGap > STREAK_RULES.longGapDays;

  return {
    current_streak: current,
    longest_streak: longest,
    last_active_date: lastActive,
    freezes_available: freezes,
    needs_welcome_back,
    day_status,
  };
}
