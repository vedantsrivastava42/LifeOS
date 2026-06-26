/**
 * Thin fetch wrappers over the route handlers. All app data flows through here
 * (via the React Query hooks), never directly to Supabase from the client —
 * XP/streak computation is server-only.
 */
import type {
  LogInput,
  CreateQuestInput,
  RescheduleInput,
} from "@/lib/validation/schemas";
import type { SheetItemRow, SheetRow } from "@/lib/domain/types";
import type { BadgeStats, BadgeStatus } from "@/lib/domain/badges";
import type {
  ArchiveEntry,
  CalendarResponse,
  CategoryView,
  InsightsResponse,
  MonthInsightsResponse,
  LogResult,
  QuestDetail,
  QuestSummary,
  TodayResponse,
} from "@/lib/api/types";

export type SheetView = SheetRow & { item_count: number };

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  today: (today: string) =>
    req<TodayResponse>(`/api/today?today=${today}`),

  quests: (status: string, today: string) =>
    req<{ quests: QuestSummary[] }>(
      `/api/quests?status=${status}&today=${today}`,
    ),

  questsByCategory: (categoryId: string, status: string, today: string) =>
    req<{ quests: QuestSummary[] }>(
      `/api/quests?status=${status}&category_id=${categoryId}&today=${today}`,
    ),

  quest: (id: string, today: string) =>
    req<{ quest: QuestDetail }>(`/api/quests/${id}?today=${today}`),

  createQuest: (input: CreateQuestInput) =>
    req<{ id: string }>(`/api/quests`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  patchQuest: (
    id: string,
    body: { status?: string; name?: string; end_date?: string | null },
  ) =>
    req<{ quest: unknown }>(`/api/quests/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteQuest: (id: string) =>
    req<{ ok: true }>(`/api/quests/${id}`, { method: "DELETE" }),

  log: (id: string, input: LogInput) =>
    req<LogResult>(`/api/quests/${id}/log`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  calendar: (id: string, month: string, today: string) =>
    req<CalendarResponse>(
      `/api/quests/${id}/calendar?month=${month}&today=${today}`,
    ),

  categories: () => req<{ categories: CategoryView[] }>(`/api/categories`),

  createCategory: (input: { name: string; icon?: string; color?: string }) =>
    req<{ category: CategoryView }>(`/api/categories`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  sheets: (categoryId?: string) =>
    req<{ sheets: SheetView[] }>(
      `/api/sheets${categoryId ? `?category_id=${categoryId}` : ""}`,
    ),

  sheet: (id: string) =>
    req<{ sheet: SheetRow; items: SheetItemRow[] }>(`/api/sheets/${id}`),

  reschedule: (id: string, body: RescheduleInput, today: string) =>
    req<{ ok: true; scheduled: number; backlog: number }>(
      `/api/quests/${id}/schedule?today=${today}`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  archive: (today: string) =>
    req<{ entries: ArchiveEntry[] }>(`/api/archive?today=${today}`),

  badges: () =>
    req<{ badges: BadgeStatus[]; stats: BadgeStats }>(`/api/badges`),

  insights: (today: string) =>
    req<InsightsResponse>(`/api/insights?today=${today}`),

  monthInsights: (month: string) =>
    req<MonthInsightsResponse>(`/api/insights/month?month=${month}`),
};
