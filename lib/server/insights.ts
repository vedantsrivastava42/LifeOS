import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityDay,
  InsightsResponse,
  XpBucket,
} from "@/lib/api/types";
import {
  daysBetween,
  monthBounds,
  shiftDays,
  weekdayOf,
  type DateStr,
} from "@/lib/domain/dates";
import { loadCategoryMap, type CategoryLite } from "@/lib/server/quests";

type DayLogRow = {
  log_date: string;
  quest_id: string;
  item_ids: string[] | null;
  note: string | null;
};

const MON = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const ACTIVITY_DAYS = 30;
const WEEK_BUCKETS = 8;
const MONTH_BUCKETS = 12;

/** Monday on/before the given date. */
function mondayOf(d: DateStr): DateStr {
  return shiftDays(d, -((weekdayOf(d) + 6) % 7));
}
function fmtMd(d: DateStr): string {
  const [, m, day] = d.split("-").map(Number);
  return `${MON[m - 1]} ${day}`;
}
function addMonth(year: number, monthIdx0: number, delta: number) {
  let y = year;
  let m = monthIdx0 + delta;
  while (m < 0) {
    m += 12;
    y -= 1;
  }
  while (m > 11) {
    m -= 12;
    y += 1;
  }
  return { y, m };
}

export async function buildInsights(
  supabase: SupabaseClient,
  userId: string,
  today: DateStr,
): Promise<InsightsResponse> {
  const yearAgo = shiftDays(today, -364);
  const activityStart = shiftDays(today, -(ACTIVITY_DAYS - 1));

  const [xpRes, logsRes, catMap] = await Promise.all([
    supabase
      .from("xp_events")
      .select("event_date, amount, quest_id")
      .eq("user_id", userId)
      .gte("event_date", yearAgo),
    supabase
      .from("day_logs")
      .select("log_date, quest_id, item_ids, note")
      .eq("user_id", userId)
      .gte("log_date", activityStart)
      .order("log_date", { ascending: false }),
    loadCategoryMap(supabase),
  ]);

  // ── XP aggregations ──
  const dateXp = new Map<string, number>();
  const questDateXp = new Map<string, number>();
  const weekXp = new Map<string, number>();
  const monthXp = new Map<string, number>();
  for (const e of xpRes.data ?? []) {
    const date = e.event_date as string;
    const amt = e.amount as number;
    dateXp.set(date, (dateXp.get(date) ?? 0) + amt);
    weekXp.set(mondayOf(date), (weekXp.get(mondayOf(date)) ?? 0) + amt);
    const ym = date.slice(0, 7);
    monthXp.set(ym, (monthXp.get(ym) ?? 0) + amt);
    if (e.quest_id) {
      const k = `${e.quest_id}|${date}`;
      questDateXp.set(k, (questDateXp.get(k) ?? 0) + amt);
    }
  }

  let day = 0, week = 0, month = 0, year = 0;
  for (const [date, xp] of dateXp) {
    const ago = daysBetween(date, today); // 0 = today, +ve = days ago
    if (ago < 0) continue;
    if (ago <= 364) year += xp;
    if (ago <= 29) month += xp;
    if (ago <= 6) week += xp;
    if (ago === 0) day += xp;
  }

  // Weekly buckets (oldest → newest).
  const thisMonday = mondayOf(today);
  const weekly: XpBucket[] = [];
  for (let i = WEEK_BUCKETS - 1; i >= 0; i--) {
    const start = shiftDays(thisMonday, -7 * i);
    weekly.push({ label: fmtMd(start), start, xp: weekXp.get(start) ?? 0 });
  }

  // Monthly buckets (oldest → newest).
  const [ty, tm] = today.slice(0, 7).split("-").map(Number);
  const monthly: XpBucket[] = [];
  for (let i = MONTH_BUCKETS - 1; i >= 0; i--) {
    const { y, m } = addMonth(ty, tm - 1, -i);
    const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
    monthly.push({ label: MON[m], start: ym, xp: monthXp.get(ym) ?? 0 });
  }

  const comparison = {
    this_week: weekly[weekly.length - 1]?.xp ?? 0,
    last_week: weekly[weekly.length - 2]?.xp ?? 0,
    this_month: monthly[monthly.length - 1]?.xp ?? 0,
    last_month: monthly[monthly.length - 2]?.xp ?? 0,
  };

  // ── Activity feed (recent days) ──
  const activity = await assembleActivity(
    supabase,
    (logsRes.data ?? []) as DayLogRow[],
    dateXp,
    questDateXp,
    catMap,
  );

  return {
    windows: { day, week, month, year },
    comparison,
    weekly,
    monthly,
    activity,
  };
}

/** Resolve a set of day_logs into a per-day activity feed (newest → oldest). */
async function assembleActivity(
  supabase: SupabaseClient,
  logs: DayLogRow[],
  dateXp: Map<string, number>,
  questDateXp: Map<string, number>,
  catMap: Map<string, CategoryLite>,
): Promise<ActivityDay[]> {
  const itemIds = new Set<string>();
  const questIds = new Set<string>();
  for (const l of logs) {
    if (l.quest_id) questIds.add(l.quest_id);
    for (const id of l.item_ids ?? []) itemIds.add(id);
  }

  const [labelRes, questRes] = await Promise.all([
    itemIds.size
      ? supabase.from("quest_items").select("id, label").in("id", [...itemIds])
      : Promise.resolve({ data: [] as { id: string; label: string }[] }),
    questIds.size
      ? supabase
          .from("quests")
          .select("id, name, category_id")
          .in("id", [...questIds])
      : Promise.resolve({
          data: [] as { id: string; name: string; category_id: string }[],
        }),
  ]);

  const labelById = new Map<string, string>();
  for (const it of labelRes.data ?? [])
    labelById.set(it.id as string, it.label as string);
  const questById = new Map<string, { name: string; category_id: string }>();
  for (const q of questRes.data ?? [])
    questById.set(q.id as string, {
      name: q.name as string,
      category_id: q.category_id as string,
    });

  const byDate = new Map<string, ActivityDay>();
  for (const l of logs) {
    const date = l.log_date;
    if (!byDate.has(date))
      byDate.set(date, { date, xp: dateXp.get(date) ?? 0, entries: [] });
    const q = questById.get(l.quest_id);
    const cat = q ? catMap.get(q.category_id ?? "") : null;
    byDate.get(date)!.entries.push({
      quest: q?.name ?? "Quest",
      icon: cat?.icon ?? null,
      color: cat?.color ?? null,
      items: (l.item_ids ?? [])
        .map((id) => labelById.get(id))
        .filter((x): x is string => !!x),
      note: l.note ?? null,
      xp: questDateXp.get(`${l.quest_id}|${date}`) ?? 0,
    });
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/** Per-day XP + activity for one calendar month (yyyy-MM). */
export async function buildMonthInsights(
  supabase: SupabaseClient,
  userId: string,
  month: string,
): Promise<{ month: string; total: number; days: ActivityDay[] }> {
  const { start, end } = monthBounds(month);

  const [xpRes, logsRes, catMap] = await Promise.all([
    supabase
      .from("xp_events")
      .select("event_date, amount, quest_id")
      .eq("user_id", userId)
      .gte("event_date", start)
      .lte("event_date", end),
    supabase
      .from("day_logs")
      .select("log_date, quest_id, item_ids, note")
      .eq("user_id", userId)
      .gte("log_date", start)
      .lte("log_date", end)
      .order("log_date", { ascending: false }),
    loadCategoryMap(supabase),
  ]);

  const dateXp = new Map<string, number>();
  const questDateXp = new Map<string, number>();
  let total = 0;
  for (const e of xpRes.data ?? []) {
    const date = e.event_date as string;
    const amt = e.amount as number;
    total += amt;
    dateXp.set(date, (dateXp.get(date) ?? 0) + amt);
    if (e.quest_id) {
      const k = `${e.quest_id}|${date}`;
      questDateXp.set(k, (questDateXp.get(k) ?? 0) + amt);
    }
  }

  const days = await assembleActivity(
    supabase,
    (logsRes.data ?? []) as DayLogRow[],
    dateXp,
    questDateXp,
    catMap,
  );

  return { month: month.slice(0, 7), total, days };
}
