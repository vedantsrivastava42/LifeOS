/**
 * ─────────────────────────────────────────────────────────────────────────
 *  TUNABLE GAME CONSTANTS
 * ─────────────────────────────────────────────────────────────────────────
 *  This is the single place to tune how XP and streaks feel. Everything that
 *  awards XP or moves a streak reads from here. Change a number, change the
 *  feel — no logic edits required.
 *
 *  Design intent (from the product brief):
 *    • Reward consistency, never cramming  → diminishing daily returns.
 *    • Streaks should *want* you to succeed → rest days + earnable freezes,
 *      soft decay instead of hard resets.
 *    • Small, frequent moments of delight  → streak bonus, levels.
 */

/** Base XP for a single logged thing, before any multipliers. */
export const XP_BASE = {
  /** Per-difficulty problem values. */
  easy: 10,
  medium: 15,
  hard: 25,
  /** A problem/custom item with no known difficulty. */
  problemDefault: 12,
  /** One daily tick on a streak quest. */
  tick: 10,
  /** Completing a milestone / checklist item. */
  milestoneItem: 50,
  /** Doing a scheduled contest. */
  contest: 30,
  /** A plain note with no items attached. */
  note: 5,
} as const;

/**
 * Diminishing returns *within a single day for a single quest*.
 * The Nth item logged today earns base × max(floor, 1 - step·(N-1)).
 * Encodes "spread it out beats cramming."
 */
export const DIMINISHING = {
  step: 0.1, // each successive item is worth 10% less
  floor: 0.5, // ...but never less than half
} as const;

/**
 * Streak bonus: a gentle multiplier that grows with the current streak and is
 * capped, so a long streak feels rewarding without runaway numbers.
 */
export const STREAK_BONUS = {
  perDay: 0.02, // +2% per consecutive active day
  max: 0.3, // capped at +30%
} as const;

/**
 * Anti-anxiety streak mechanics. See lib/domain/streak.ts for how these apply.
 */
export const STREAK_RULES = {
  /** Earn 1 freeze for every N consecutive active days. */
  freezeEveryNDays: 5,
  /** Hard cap on stored freezes if a quest's config doesn't specify one. */
  defaultFreezesMax: 3,
  /** Default initial freeze grant for a new streak quest. */
  defaultFreezesStart: 1,
  /**
   * When an uncovered (no-freeze) miss happens on a non-rest day, the streak
   * decays by this many days *per missed day in the gap* — a soft step-down,
   * not a reset.
   */
  softDecayDaysPerMiss: 3,
  /**
   * A gap longer than this many calendar days is treated as "stepped away":
   * the streak resets to 0 and the welcome-back flow is offered.
   */
  longGapDays: 7,
} as const;

/**
 * Levels are a global, cosmetic layer over total lifetime XP — a quiet sense of
 * overall progress. Level L begins at `base · L^exp` cumulative XP.
 */
export const LEVELS = {
  base: 120,
  exp: 1.6,
} as const;

export type Difficulty = "easy" | "medium" | "hard";
