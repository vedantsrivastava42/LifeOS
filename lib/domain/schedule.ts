/**
 * Deterministic schedule expansion. Contest dates are a fixed rule, so they are
 * generated in code — never asked of an LLM (per the brief).
 *
 *   • LeetCode Weekly   = every Sunday in range.
 *   • LeetCode Biweekly = every other Saturday in range.
 *
 * Biweekly cadence is anchored to the first Saturday on/after the start date and
 * steps by 14 days. For an open-ended quest (no end date) we generate a sensible
 * forward horizon so there's always something on the calendar.
 */
import { rangeDays, shiftDays, weekdayOf, type DateStr } from "@/lib/domain/dates";

const OPEN_ENDED_HORIZON_DAYS = 12 * 7; // ~12 weeks of contests when goalless

export interface ContestDraft {
  label: string;
  due_date: DateStr;
}

export interface ContestOptions {
  weekly?: boolean;
  biweekly?: boolean;
}

export function generateContests(
  start: DateStr,
  end: DateStr | null,
  opts: ContestOptions,
): ContestDraft[] {
  const lastDay = end ?? shiftDays(start, OPEN_ENDED_HORIZON_DAYS);
  const days = rangeDays(start, lastDay);
  const drafts: ContestDraft[] = [];

  if (opts.weekly) {
    for (const d of days) {
      if (weekdayOf(d) === 0) {
        drafts.push({ label: "LeetCode Weekly Contest", due_date: d });
      }
    }
  }

  if (opts.biweekly) {
    // Anchor to the first Saturday on/after start, then step 14 days.
    const firstSaturday = days.find((d) => weekdayOf(d) === 6);
    if (firstSaturday) {
      let d = firstSaturday;
      while (days.includes(d)) {
        drafts.push({ label: "LeetCode Biweekly Contest", due_date: d });
        d = shiftDays(d, 14);
      }
    }
  }

  return drafts.sort((a, b) => a.due_date.localeCompare(b.due_date));
}

// ── Per-day scheduling ──────────────────────────────────────────────────
export type Cadence = "daily" | "weekdays" | "weekends" | "custom";

/** Weekday numbers (0=Sun…6=Sat) that count as active for a cadence. */
export function weekdaysForCadence(
  cadence: Cadence,
  custom?: number[],
): number[] {
  switch (cadence) {
    case "weekdays":
      return [1, 2, 3, 4, 5];
    case "weekends":
      return [0, 6];
    case "custom":
      return custom?.length ? [...custom].sort() : [0, 1, 2, 3, 4, 5, 6];
    case "daily":
    default:
      return [0, 1, 2, 3, 4, 5, 6];
  }
}

export interface DailyAssignment {
  date: DateStr;
  count: number;
}

/**
 * Spread `total` items across active weekdays starting at `start`, at
 * `pacePerWeek` per calendar week, distributed as evenly as possible within
 * each week (earlier active days get the remainder). Returns per-day counts
 * until all `total` items are placed.
 *
 *   e.g. pace 10/week, daily → Mon 2, Tue 2, Wed 2, Thu 1, Fri 1, Sat 1, Sun 1
 *   e.g. pace 14/week, weekends → Sat 7, Sun 7
 */
export function assignDailyCounts(
  start: DateStr,
  total: number,
  pacePerWeek: number,
  activeWeekdays: number[],
): DailyAssignment[] {
  if (total <= 0 || pacePerWeek <= 0 || activeWeekdays.length === 0) return [];
  const active = new Set(activeWeekdays);
  const out: DailyAssignment[] = [];
  let remaining = total;
  let weekStart = start;
  let guard = 0;

  while (remaining > 0 && guard++ < 1040 /* ~20yr of weeks */) {
    const weekDays = rangeDays(weekStart, shiftDays(weekStart, 6)).filter((d) =>
      active.has(weekdayOf(d)),
    );
    const itemsThisWeek = Math.min(pacePerWeek, remaining);
    if (weekDays.length && itemsThisWeek > 0) {
      const base = Math.floor(itemsThisWeek / weekDays.length);
      const extra = itemsThisWeek % weekDays.length;
      weekDays.forEach((d, i) => {
        const count = base + (i < extra ? 1 : 0);
        if (count > 0) out.push({ date: d, count });
      });
      remaining -= itemsThisWeek;
    }
    weekStart = shiftDays(weekStart, 7);
  }
  return out;
}

// ── Topic-sequenced scheduling ──────────────────────────────────────────
/**
 * One topic in the plan: how many of its problems to schedule, and how fast.
 * Topics are processed in array order — that's the user's chosen sequence
 * (e.g. "DP first"). Each topic carries its own pace, so you can do 4/week of
 * one topic and 20/week of another.
 */
export interface TopicSlice {
  topic: string;
  pace_per_week: number;
  count: number;
}

/**
 * Lay out topics one after another, in the given order, each at its own pace,
 * across the active weekdays. A topic's block starts the day after the previous
 * topic's last scheduled day, so blocks never overlap and there are no idle
 * gaps. Returns one entry per scheduled problem, in scheduling order
 * (topic-major), each tagged with its topic and assigned date.
 *
 *   e.g. [DP 55 @ 20/wk, Arrays 40 @ 10/wk], daily →
 *        DP fills the first ~3 weeks, Arrays picks up the day DP ends.
 */
export function buildTopicSchedule(
  start: DateStr,
  topics: TopicSlice[],
  activeWeekdays: number[],
): { topic: string; date: DateStr }[] {
  const out: { topic: string; date: DateStr }[] = [];
  let cursor = start;
  for (const t of topics) {
    if (t.count <= 0) continue;
    const pace = t.pace_per_week > 0 ? t.pace_per_week : 1;
    const plan = assignDailyCounts(cursor, t.count, pace, activeWeekdays);
    if (!plan.length) continue;
    for (const a of plan) {
      for (let k = 0; k < a.count; k++) out.push({ topic: t.topic, date: a.date });
    }
    // Next topic resumes the day after this one's last scheduled day.
    cursor = shiftDays(plan[plan.length - 1].date, 1);
  }
  return out;
}

/**
 * Given an ordered item count and a per-day plan, return the due date for each
 * item index (or null if it falls beyond the plan). Items are handed out in
 * order, so a pattern-ordered sheet stays pattern-ordered across days.
 */
export function assignItemDueDates(
  itemCount: number,
  plan: DailyAssignment[],
): (DateStr | null)[] {
  const due: (DateStr | null)[] = new Array(itemCount).fill(null);
  let idx = 0;
  for (const a of plan) {
    for (let k = 0; k < a.count && idx < itemCount; k++) due[idx++] = a.date;
    if (idx >= itemCount) break;
  }
  return due;
}

/**
 * Distribute a target number of items across the weeks of a quest at a pace.
 * Returns the count per ISO-week-index (0-based from start). Used to show a
 * "problems/week" plan and (later) to inform Flow A's generated plan.
 */
export function distributeTarget(
  start: DateStr,
  end: DateStr | null,
  targetCount: number,
  pacePerWeek: number,
): { weekStart: DateStr; count: number }[] {
  if (targetCount <= 0 || pacePerWeek <= 0) return [];
  const horizonEnd =
    end ?? shiftDays(start, Math.ceil(targetCount / pacePerWeek) * 7);
  const totalDays = Math.max(1, rangeDays(start, horizonEnd).length);
  const weeks = Math.max(1, Math.ceil(totalDays / 7));

  const plan: { weekStart: DateStr; count: number }[] = [];
  let remaining = targetCount;
  for (let w = 0; w < weeks && remaining > 0; w++) {
    const count = Math.min(pacePerWeek, remaining);
    plan.push({ weekStart: shiftDays(start, w * 7), count });
    remaining -= count;
  }
  return plan;
}
