import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestRow } from "@/lib/domain/types";
import type { TodayResponse } from "@/lib/api/types";
import { weekdayLabel, weekdayOf, type DateStr } from "@/lib/domain/dates";
import { levelFromXp } from "@/lib/server/compute";
import { loadCategoryMap, summarizeQuests } from "@/lib/server/quests";

function greetingFor(today: DateStr): string {
  const phrases = [
    "A fresh page.",
    "One small step today.",
    "Keep it moving.",
    "Show up, that's it.",
    "Steady wins.",
    "Here's your today.",
    "Quiet progress.",
  ];
  return phrases[weekdayOf(today) % phrases.length];
}

export async function buildToday(
  supabase: SupabaseClient,
  userId: string,
  today: DateStr,
): Promise<TodayResponse> {
  // Active quests, category map, and the user's full XP ledger are all
  // independent → fetch in parallel. (XP read once covers both lifetime and
  // today's total, instead of two separate queries.)
  const [questRows, catMap, xpRes] = await Promise.all([
    supabase
      .from("quests")
      .select("*")
      .eq("status", "active")
      .lte("start_date", today)
      .order("created_at", { ascending: true }),
    loadCategoryMap(supabase),
    supabase.from("xp_events").select("amount, event_date").eq("user_id", userId),
  ]);

  const quests = (questRows.data ?? []) as QuestRow[];
  const summaries = await summarizeQuests(supabase, quests, catMap, today);

  let lifetime = 0;
  let total_today_xp = 0;
  for (const r of xpRes.data ?? []) {
    const amt = r.amount as number;
    lifetime += amt;
    if ((r.event_date as string) === today) total_today_xp += amt;
  }

  return {
    date: today,
    greeting: `${weekdayLabel(weekdayOf(today))} · ${greetingFor(today)}`,
    total_today_xp,
    level: levelFromXp(lifetime),
    lifetime_xp: lifetime,
    quests: summaries,
  };
}
