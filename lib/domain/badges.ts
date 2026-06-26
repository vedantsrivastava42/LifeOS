/**
 * Achievements / badges. Pure & deterministic — earned status is derived from
 * the same ledgers everything else uses (no separate "awarded" table). A badge
 * is earned the moment its metric crosses the threshold; we also expose
 * progress so locked badges can show how close you are.
 */

export type BadgeMetric =
  | "level"
  | "xp"
  | "streak"
  | "problems"
  | "completed";

export interface BadgeStats {
  level: number;
  xp: number;
  longestStreak: number;
  problemsDone: number;
  questsCompleted: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  metric: BadgeMetric;
  threshold: number;
  blurb: string;
  /** Optional accent color (used by ranks to tint the name). */
  color?: string;
}

export interface BadgeStatus extends BadgeDef {
  current: number;
  earned: boolean;
  progress: number; // 0..1
}

/**
 * Codeforces-style rank ladder — one rank every 10 levels. `rankForLevel`
 * resolves your current rank; each rank is also a badge in the catalog.
 */
export interface Rank {
  name: string;
  level: number; // level at which this rank is reached
  color: string;
  icon: string;
}

export const RANKS: Rank[] = [
  { name: "Newbie", level: 1, color: "#9aa0a6", icon: "🐣" },
  { name: "Pupil", level: 10, color: "#4ade80", icon: "📗" },
  { name: "Apprentice", level: 20, color: "#22c55e", icon: "🌿" },
  { name: "Specialist", level: 30, color: "#2dd4bf", icon: "🐬" },
  { name: "Expert", level: 40, color: "#5b8cff", icon: "🔵" },
  { name: "Candidate Master", level: 50, color: "#c084fc", icon: "🟣" },
  { name: "Master", level: 60, color: "#fbbf24", icon: "🟠" },
  { name: "International Master", level: 70, color: "#fb923c", icon: "🧠" },
  { name: "Grandmaster", level: 80, color: "#f87171", icon: "🔴" },
  { name: "International Grandmaster", level: 90, color: "#f472b6", icon: "💥" },
  { name: "Legendary Grandmaster", level: 100, color: "#ef4444", icon: "👑" },
];

/** The highest rank reached at a given level. */
export function rankForLevel(level: number): Rank {
  let r = RANKS[0];
  for (const rk of RANKS) if (level >= rk.level) r = rk;
  return r;
}

/** The next rank to aim for (null once at the top). */
export function nextRank(level: number): Rank | null {
  return RANKS.find((rk) => rk.level > level) ?? null;
}

/** The badge catalog: rank ladder (every 10 levels) + other achievements. */
export const BADGES: BadgeDef[] = [
  // ── Rank ladder (level, every 10) ──
  ...RANKS.map((r) => ({
    id: `rank-${r.level}`,
    name: r.name,
    icon: r.icon,
    metric: "level" as const,
    threshold: r.level,
    blurb: `Reach level ${r.level}`,
    color: r.color,
  })),
  // ── Lifetime XP ──
  { id: "xp-1k", name: "Grinder", icon: "💎", metric: "xp", threshold: 1000, blurb: "Earn 1,000 lifetime XP" },
  { id: "xp-5k", name: "Relentless", icon: "🔷", metric: "xp", threshold: 5000, blurb: "Earn 5,000 lifetime XP" },
  { id: "xp-15k", name: "Unstoppable", icon: "🛡️", metric: "xp", threshold: 15000, blurb: "Earn 15,000 lifetime XP" },
  // ── Streaks ──
  { id: "streak-7", name: "Warming Up", icon: "🔥", metric: "streak", threshold: 7, blurb: "Hit a 7-day streak" },
  { id: "streak-30", name: "On Fire", icon: "🔥", metric: "streak", threshold: 30, blurb: "Hit a 30-day streak" },
  { id: "streak-100", name: "Inferno", icon: "🌋", metric: "streak", threshold: 100, blurb: "Hit a 100-day streak" },
  // ── Problems solved ──
  { id: "prob-25", name: "First Steps", icon: "🧩", metric: "problems", threshold: 25, blurb: "Solve 25 problems" },
  { id: "prob-100", name: "Century", icon: "💯", metric: "problems", threshold: 100, blurb: "Solve 100 problems" },
  { id: "prob-250", name: "Problem Crusher", icon: "🦾", metric: "problems", threshold: 250, blurb: "Solve 250 problems" },
  { id: "prob-422", name: "A–Z Conqueror", icon: "🏆", metric: "problems", threshold: 422, blurb: "Solve 422 problems" },
  // ── Quests completed ──
  { id: "done-1", name: "First Finish", icon: "🎯", metric: "completed", threshold: 1, blurb: "Complete your first quest" },
  { id: "done-5", name: "Closer", icon: "✅", metric: "completed", threshold: 5, blurb: "Complete 5 quests" },
];

function valueFor(metric: BadgeMetric, s: BadgeStats): number {
  switch (metric) {
    case "level":
      return s.level;
    case "xp":
      return s.xp;
    case "streak":
      return s.longestStreak;
    case "problems":
      return s.problemsDone;
    case "completed":
      return s.questsCompleted;
  }
}

export function computeBadges(stats: BadgeStats): BadgeStatus[] {
  return BADGES.map((b) => {
    const current = valueFor(b.metric, stats);
    return {
      ...b,
      current,
      earned: current >= b.threshold,
      progress: b.threshold > 0 ? Math.min(1, current / b.threshold) : 0,
    };
  });
}
