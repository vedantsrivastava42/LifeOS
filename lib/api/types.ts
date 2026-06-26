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
  /** For milestone & daily: all checklist/task items. */
  checklist?: QuestItemRow[];
  /** Quest item ids logged today (drives "done today" for daily tasks). */
  today_item_ids: string[];
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

// ── Insights ──────────────────────────────────────────────────────────────
export interface XpWindows {
  day: number; // last 1 day (today)
  week: number; // last 7 days
  month: number; // last 30 days
  year: number; // last 365 days
}

export interface XpComparison {
  this_week: number;
  last_week: number;
  this_month: number;
  last_month: number;
}

export interface XpBucket {
  label: string; // e.g. "Mon 23" or "Jun"
  start: string; // yyyy-MM-dd (week) or yyyy-MM (month)
  xp: number;
}

export interface ActivityEntry {
  quest: string;
  icon: string | null;
  color: string | null;
  items: string[]; // labels of things done
  note: string | null;
  xp: number;
}

export interface ActivityDay {
  date: string; // yyyy-MM-dd
  xp: number;
  entries: ActivityEntry[];
}

export interface InsightsResponse {
  windows: XpWindows;
  comparison: XpComparison;
  weekly: XpBucket[]; // last 8 calendar weeks (oldest → newest)
  monthly: XpBucket[]; // last 12 calendar months (oldest → newest)
  activity: ActivityDay[]; // recent days (newest → oldest)
}

export interface MonthInsightsResponse {
  month: string; // yyyy-MM
  total: number;
  days: ActivityDay[]; // every active day in the month (newest → oldest)
}
