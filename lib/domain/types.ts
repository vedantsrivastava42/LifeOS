/**
 * TypeScript shapes mirroring the Postgres schema (see supabase/migrations).
 * These describe rows as returned by the Supabase client.
 */

export type Difficulty = "easy" | "medium" | "hard";
export type QuestType = "streak" | "target" | "milestone" | "daily";
export type QuestStatus = "active" | "completed" | "archived";
export type QuestItemKind =
  | "problem"
  | "contest"
  | "checklist"
  | "custom"
  | "daily";
export type DayLogKind = "tick" | "items" | "note";
export type SheetSource =
  | "striver"
  | "neetcode"
  | "blind75"
  | "custom"
  | "ai_generated";

export interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_preset: boolean;
  created_at: string;
  updated_at: string;
}

export interface SheetRow {
  id: string;
  user_id: string;
  name: string;
  source: SheetSource;
  category_id: string | null;
  is_preset: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SheetItemRow {
  id: string;
  user_id: string;
  sheet_id: string;
  title: string;
  topic: string | null;
  pattern: string | null; // sub-grouping within a topic (e.g. "Kadane")
  difficulty: Difficulty | null;
  url: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/** One topic in a topic-sequenced plan (order in the array = the sequence). */
export interface TopicSchedule {
  topic: string;
  pace_per_week: number;
  count: number; // problems scheduled from this topic
}

/** A day-by-day schedule baked into a target quest. */
export interface ScheduleConfig {
  cadence: "daily" | "weekdays" | "weekends" | "custom";
  active_weekdays: number[]; // 0=Sun … 6=Sat
  /**
   * When present, the plan is topic-sequenced: topics are done in this order,
   * each at its own pace. Absent = flat plan (sheet order, single pace).
   */
  topics?: TopicSchedule[];
}

/** Type-specific settings stored in quests.config (jsonb). */
export interface TargetConfig {
  target_count: number;
  pace_per_week: number;
  /** Present when the quest has an auto-generated day-by-day plan. */
  schedule?: ScheduleConfig;
}
export interface StreakConfig {
  /** Weekday numbers (0 = Sun … 6 = Sat) that never count as a break. */
  rest_days: number[];
  /** Live/initial freeze count (the live value is recomputed server-side). */
  freezes_available: number;
  freezes_max: number;
  /** Custom XP for one daily tick; null/undefined = default. */
  tick_xp?: number;
}
export type MilestoneConfig = Record<string, unknown>;
export type QuestConfig = TargetConfig | StreakConfig | MilestoneConfig;

export interface QuestRow {
  id: string;
  user_id: string;
  name: string;
  category_id: string;
  type: QuestType;
  start_date: string; // yyyy-MM-dd
  end_date: string | null; // null = open-ended
  status: QuestStatus;
  sheet_id: string | null;
  config: QuestConfig;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestItemRow {
  id: string;
  user_id: string;
  quest_id: string;
  label: string;
  source_item_id: string | null;
  topic: string | null;
  pattern: string | null; // sub-grouping within a topic (e.g. "Kadane")
  difficulty: Difficulty | null;
  due_date: string | null; // yyyy-MM-dd, for scheduled items (contests)
  is_done: boolean;
  done_at: string | null;
  kind: QuestItemKind;
  /** Custom XP for this item (checklist/daily); null = use the default. */
  xp_value: number | null;
  /** Per-task category (used by Daily tasks for filtering); null = inherit. */
  category_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface DayLogRow {
  id: string;
  user_id: string;
  quest_id: string;
  log_date: string; // yyyy-MM-dd
  kind: DayLogKind;
  note: string | null;
  item_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface XpEventRow {
  id: string;
  user_id: string;
  quest_id: string | null;
  event_date: string; // yyyy-MM-dd
  amount: number;
  base_amount: number;
  multiplier: number;
  reason: string;
  created_at: string;
}

export interface StreakStateRow {
  id: string;
  user_id: string;
  quest_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  freezes_available: number;
  created_at: string;
  updated_at: string;
}

export interface RetrospectiveRow {
  id: string;
  user_id: string;
  quest_id: string;
  generated_at: string;
  content_md: string;
  stats: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Type guards / helpers ────────────────────────────────────────────────

export function isTargetConfig(c: QuestConfig): c is TargetConfig {
  return typeof (c as TargetConfig)?.target_count === "number";
}
export function isStreakConfig(c: QuestConfig): c is StreakConfig {
  return Array.isArray((c as StreakConfig)?.rest_days);
}
