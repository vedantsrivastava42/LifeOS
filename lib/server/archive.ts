import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestItemRow, QuestRow } from "@/lib/domain/types";
import { isTargetConfig } from "@/lib/domain/types";
import type { ArchiveEntry, ArchiveStats } from "@/lib/api/types";
import { daysBetween, type DateStr } from "@/lib/domain/dates";
import { liveStreak } from "@/lib/server/compute";
import { loadCategoryMap, summarizeQuest } from "@/lib/server/quests";

function strongestTopic(items: QuestItemRow[]): string | null {
  const counts = new Map<string, number>();
  for (const it of items) {
    if (it.is_done && it.topic) {
      counts.set(it.topic, (counts.get(it.topic) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let max = 0;
  for (const [topic, n] of counts) {
    if (n > max) {
      max = n;
      best = topic;
    }
  }
  return best;
}

function completionPercent(
  quest: QuestRow,
  items: QuestItemRow[],
): number | null {
  if (quest.type === "target" && isTargetConfig(quest.config)) {
    const done = items.filter(
      (i) => i.is_done && (i.kind === "problem" || i.kind === "custom"),
    ).length;
    const target = quest.config.target_count || 1;
    return Math.min(100, Math.round((done / target) * 100));
  }
  if (quest.type === "milestone") {
    const total = items.length || 1;
    const done = items.filter((i) => i.is_done).length;
    return Math.round((done / total) * 100);
  }
  return null; // streak quests have no completion %
}

export async function buildArchive(
  supabase: SupabaseClient,
  today: DateStr,
): Promise<ArchiveEntry[]> {
  const { data: questRows } = await supabase
    .from("quests")
    .select("*")
    .in("status", ["completed", "archived"])
    .order("updated_at", { ascending: false });
  const quests = (questRows ?? []) as QuestRow[];
  if (!quests.length) return [];

  const catMap = await loadCategoryMap(supabase);

  const { data: retros } = await supabase
    .from("retrospectives")
    .select("quest_id");
  const retroSet = new Set((retros ?? []).map((r) => r.quest_id as string));

  return Promise.all(
    quests.map(async (q) => {
      const { summary, items, logDates } = await summarizeQuest(
        supabase,
        q,
        catMap.get(q.category_id ?? "") ?? null,
        today,
      );
      const streak = liveStreak(q, logDates, today);
      const lastDay = q.end_date ?? streak.last_active_date ?? today;
      const stats: ArchiveStats = {
        total_active_days: logDates.length,
        longest_streak: streak.longest_streak,
        completion_percent: completionPercent(q, items),
        strongest_topic: strongestTopic(items),
        xp_total: summary.xp_total,
        span_days: Math.max(0, daysBetween(q.start_date, lastDay)),
      };
      return {
        quest: summary,
        stats,
        has_retrospective: retroSet.has(q.id),
      };
    }),
  );
}
