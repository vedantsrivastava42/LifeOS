/**
 * Deterministic XP math. No model calls — this is a fixed rule, so it's plain
 * code (fast, cheap, testable). Every awarded amount is derived here and then
 * written to the append-only xp_events ledger; totals are *always* a SUM of
 * that ledger, never a stored mutable counter.
 */
import {
  DIMINISHING,
  LEVELS,
  STREAK_BONUS,
  XP_BASE,
  type Difficulty,
} from "@/lib/config/xp";
import type { QuestItemKind } from "@/lib/domain/types";

export interface ScorableItem {
  kind: QuestItemKind;
  difficulty?: Difficulty | null;
  label?: string;
  /** Per-item XP override (checklist/daily). Wins over kind/difficulty. */
  xpOverride?: number | null;
}

export interface XpEventDraft {
  base_amount: number;
  multiplier: number;
  amount: number;
  reason: string;
}

/** Base XP for one item, before multipliers. */
export function baseForItem(item: ScorableItem): number {
  // An explicit per-item value always wins (set on milestone/daily items).
  if (item.xpOverride != null && item.xpOverride >= 0) return item.xpOverride;
  if (item.kind === "contest") return XP_BASE.contest;
  if (item.kind === "daily") return XP_BASE.dailyTask;
  if (item.kind === "checklist") return XP_BASE.milestoneItem;
  if (item.difficulty === "easy") return XP_BASE.easy;
  if (item.difficulty === "medium") return XP_BASE.medium;
  if (item.difficulty === "hard") return XP_BASE.hard;
  return XP_BASE.problemDefault; // problem/custom with unknown difficulty
}

/** Diminishing factor for the Nth item (0-based) of a quest on a given day. */
export function diminishingFactor(indexZeroBased: number): number {
  const f = 1 - DIMINISHING.step * indexZeroBased;
  return Math.max(DIMINISHING.floor, Number(f.toFixed(4)));
}

/** Streak bonus multiplier (≥ 1) for a given current streak length. */
export function streakBonusMultiplier(currentStreak: number): number {
  const bonus = Math.min(STREAK_BONUS.max, STREAK_BONUS.perDay * Math.max(0, currentStreak));
  return Number((1 + bonus).toFixed(4));
}

function diminishLabel(factor: number): string {
  return factor < 1 ? ` ·×${factor.toFixed(2)} spread` : "";
}
function streakLabel(mult: number): string {
  return mult > 1 ? ` ·×${mult.toFixed(2)} streak` : "";
}

/**
 * Score a batch of items logged for one quest on one day.
 *
 * @param items       the items being logged now (in order)
 * @param startIndex  how many scorable items were already logged for this quest
 *                    *today* (so diminishing returns continue across logs)
 * @param currentStreak the streak that includes today's activity
 */
export function scoreItems(
  items: ScorableItem[],
  startIndex: number,
  currentStreak: number,
): { events: XpEventDraft[]; total: number } {
  const streakMult = streakBonusMultiplier(currentStreak);
  const events: XpEventDraft[] = [];

  items.forEach((item, i) => {
    const base = baseForItem(item);
    const dim = diminishingFactor(startIndex + i);
    const multiplier = Number((dim * streakMult).toFixed(4));
    const amount = Math.max(1, Math.round(base * multiplier));
    const what = item.label ? `“${item.label}”` : item.kind;
    events.push({
      base_amount: base,
      multiplier,
      amount,
      reason: `${what}${diminishLabel(dim)}${streakLabel(streakMult)}`,
    });
  });

  return { events, total: events.reduce((s, e) => s + e.amount, 0) };
}

/** Score a single daily tick on a streak quest (optional custom base XP). */
export function scoreTick(
  currentStreak: number,
  base: number = XP_BASE.tick,
): XpEventDraft {
  const streakMult = streakBonusMultiplier(currentStreak);
  const amount = Math.max(1, Math.round(base * streakMult));
  return {
    base_amount: base,
    multiplier: streakMult,
    amount,
    reason: `Daily tick${streakLabel(streakMult)}`,
  };
}

/** Score a bare note (no items). */
export function scoreNote(): XpEventDraft {
  return {
    base_amount: XP_BASE.note,
    multiplier: 1,
    amount: XP_BASE.note,
    reason: "Logged a note",
  };
}

// ── Levels (cosmetic, global) ─────────────────────────────────────────────

/**
 * Cumulative XP required to *reach* the start of a given level (level ≥ 1).
 * Level k→k+1 costs `base + step·(k-1)`, so reaching level L is the sum:
 *   Σ_{k=0}^{n-1} (base + step·k) = base·n + step·n·(n-1)/2,  where n = L-1.
 */
export function xpForLevelStart(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1; // fully completed levels
  return LEVELS.base * n + (LEVELS.step * n * (n - 1)) / 2;
}

export interface LevelInfo {
  level: number;
  into: number; // xp earned into the current level
  span: number; // xp needed to span the current level
  toNext: number; // xp remaining to next level
  progress: number; // 0..1 within current level
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  while (xpForLevelStart(level + 1) <= totalXp) level++;
  const start = xpForLevelStart(level);
  const next = xpForLevelStart(level + 1);
  const span = Math.max(1, next - start);
  const into = totalXp - start;
  return {
    level,
    into,
    span,
    toNext: Math.max(0, next - totalXp),
    progress: Math.min(1, into / span),
  };
}
