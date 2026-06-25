/**
 * Date helpers. The whole app reasons about *calendar days* in the user's
 * local timezone, represented as `yyyy-MM-dd` strings. Timestamps (created_at,
 * done_at) are stored UTC; "what day did this happen" is always the local day
 * the client reports. The client passes its local `today` to the server, so we
 * never guess the server's timezone.
 */
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  getDay,
  parseISO,
  startOfMonth,
  endOfMonth,
} from "date-fns";

export type DateStr = string; // "yyyy-MM-dd"

/** Today's local calendar day as yyyy-MM-dd (browser-side). */
export function localToday(): DateStr {
  return format(new Date(), "yyyy-MM-dd");
}

/** Validate a yyyy-MM-dd string. */
export function isDateStr(s: unknown): s is DateStr {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Parse a date-only string to a local-midnight Date (for weekday math etc.). */
export function toDate(d: DateStr): Date {
  return parseISO(d);
}

/** Weekday of a date string: 0 = Sunday … 6 = Saturday. */
export function weekdayOf(d: DateStr): number {
  return getDay(toDate(d));
}

/** Calendar-day difference b - a (positive if b is after a). */
export function daysBetween(a: DateStr, b: DateStr): number {
  return differenceInCalendarDays(toDate(b), toDate(a));
}

/** Shift a date string by n days. */
export function shiftDays(d: DateStr, n: number): DateStr {
  return format(addDays(toDate(d), n), "yyyy-MM-dd");
}

/** Inclusive list of date strings from `start` to `end`. Empty if end < start. */
export function rangeDays(start: DateStr, end: DateStr): DateStr[] {
  if (daysBetween(start, end) < 0) return [];
  return eachDayOfInterval({ start: toDate(start), end: toDate(end) }).map((d) =>
    format(d, "yyyy-MM-dd"),
  );
}

/** First and last day of the month containing `monthAnchor` ("yyyy-MM" or full). */
export function monthBounds(monthAnchor: string): { start: DateStr; end: DateStr } {
  const anchor =
    monthAnchor.length === 7 ? parseISO(`${monthAnchor}-01`) : parseISO(monthAnchor);
  return {
    start: format(startOfMonth(anchor), "yyyy-MM-dd"),
    end: format(endOfMonth(anchor), "yyyy-MM-dd"),
  };
}

/** Number of whole weeks elapsed since `start` up to `asOf` (min 0). */
export function weeksElapsed(start: DateStr, asOf: DateStr): number {
  const days = daysBetween(start, asOf);
  return Math.max(0, Math.floor(days / 7));
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function weekdayLabel(n: number): string {
  return WEEKDAY_LABELS[((n % 7) + 7) % 7];
}
