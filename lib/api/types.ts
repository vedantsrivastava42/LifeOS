/**
 * Response shapes returned by the route handlers and consumed by the React
 * Query hooks. Kept separate from DB row types (lib/domain/types) because the
 * API returns *computed* views, not raw rows.
 */
import type {
  CategoryRow,
  QuestItemRow,
  QuestRow,
  QuestType,
} from "@/lib/domain/types";
import type { DayStatus } from "@/lib/domain/streak";
import type { LevelInfo } from "@/lib/domain/xp";

export interface CategoryView extends CategoryRow {
  active_quests: number;
}

export interface StreakView {
  current: number;
  longest: number;
  freezes: number;
  last_active_date: string | null;
  needs_welcome_back: boolean;
}

export interface TargetProgressView {
  done: number;
  target: number;
  pace_per_week: number;
  expected_by_now: number;
  pace: "ahead" | "on" | "behind";
  percent: number; // 0..100
}

export interface QuestSummary {
  id: string;
  name: string;
  type: QuestType;
  status: QuestRow["status"];
  start_date: string;
  end_date: string | null;
  category: Pick<CategoryRow, "id" | "name" | "icon" | "color"> | null;
  xp_total: number;
  today_xp: number;
  today_logged: boolean;
  rest_today: boolean;
  streak?: StreakView;
  progress?: TargetProgressView;
  /** Items relevant to "today": contests due today, undone checklist, etc. */
  due_today: QuestItemRow[];
  /** For milestone: all checklist items. */
  checklist?: QuestItemRow[];
  open_items: number; // count of not-yet-done items
}

export interface TodayResponse {
  date: string;
  greeting: string;
  total_today_xp: number;
  level: LevelInfo;
  lifetime_xp: number;
  quests: QuestSummary[];
}

export interface QuestDetail extends QuestSummary {
  config: QuestRow["config"];
  sheet_id: string | null;
  items: QuestItemRow[];
  recent_logs: {
    log_date: string;
    kind: string;
    note: string | null;
    item_ids: string[];
  }[];
}

export interface CalendarDay {
  date: string;
  status: DayStatus;
  logged: boolean;
  note: string | null;
  item_count: number;
  xp: number;
  /** For scheduled target quests: how many problems are planned for this day. */
  scheduled_count: number;
}

export interface CalendarResponseMeta {
  scheduled: boolean;
}

export interface CalendarResponse {
  month: string; // yyyy-MM
  quest_id: string;
  days: CalendarDay[];
  streak: StreakView;
  scheduled: boolean;
}

export interface LogResult {
  ok: true;
  xp_gained: number;
  events: { reason: string; amount: number }[];
  today_xp: number;
  lifetime_xp: number;
  level: LevelInfo;
  leveled_up: boolean;
  streak?: StreakView;
  freeze_earned: boolean;
  message: string;
}

export interface ArchiveStats {
  total_active_days: number;
  longest_streak: number;
  completion_percent: number | null;
  strongest_topic: string | null;
  xp_total: number;
  span_days: number;
}

export interface ArchiveEntry {
  quest: QuestSummary;
  stats: ArchiveStats;
  has_retrospective: boolean;
}
