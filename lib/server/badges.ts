import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeBadges,
  type BadgeStats,
  type BadgeStatus,
} from "@/lib/domain/badges";
import { levelFromXp } from "@/lib/domain/xp";
import { lifetimeXp } from "@/lib/server/compute";

/** Gather the user's badge stats and compute earned/locked badges. */
export async function buildBadges(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ badges: BadgeStatus[]; stats: BadgeStats }> {
  const [xp, problemsRes, completedRes, streaksRes] = await Promise.all([
    lifetimeXp(supabase, userId),
    supabase
      .from("quest_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_done", true)
      .in("kind", ["problem", "custom"]),
    supabase
      .from("quests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("streak_state")
      .select("longest_streak")
      .eq("user_id", userId),
  ]);

  const longestStreak = Math.max(
    0,
    ...(streaksRes.data ?? []).map((r) => (r.longest_streak as number) ?? 0),
  );

  const stats: BadgeStats = {
    level: levelFromXp(xp).level,
    xp,
    longestStreak,
    problemsDone: problemsRes.count ?? 0,
    questsCompleted: completedRes.count ?? 0,
  };

  return { badges: computeBadges(stats), stats };
}
