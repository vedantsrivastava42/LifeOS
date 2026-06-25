import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestRow } from "@/lib/domain/types";
import type { TodayResponse } from "@/lib/api/types";
import { weekdayLabel, weekdayOf, type DateStr } from "@/lib/domain/dates";
import { levelFromXp, lifetimeXp } from "@/lib/server/compute";
import { loadCategoryMap, summarizeQuest } from "@/lib/server/quests";

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
  const { data: questRows } = await supabase
    .from("quests")
    .select("*")
    .eq("status", "active")
    .lte("start_date", today)
    .order("created_at", { ascending: true });

  const quests = (questRows ?? []) as QuestRow[];
  const catMap = await loadCategoryMap(supabase);

  const summaries = await Promise.all(
    quests.map(async (q) => {
      const { summary } = await summarizeQuest(
        supabase,
        q,
        catMap.get(q.category_id ?? "") ?? null,
        today,
      );
      return summary;
    }),
  );

  const { data: todayRows } = await supabase
    .from("xp_events")
    .select("amount")
    .eq("user_id", userId)
    .eq("event_date", today);
  const total_today_xp = (todayRows ?? []).reduce(
    (s, r) => s + (r.amount as number),
    0,
  );

  const lifetime = await lifetimeXp(supabase, userId);

  return {
    date: today,
    greeting: `${weekdayLabel(weekdayOf(today))} · ${greetingFor(today)}`,
    total_today_xp,
    level: levelFromXp(lifetime),
    lifetime_xp: lifetime,
    quests: summaries,
  };
}
