"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { localToday } from "@/lib/domain/dates";
import type {
  LogInput,
  CreateQuestInput,
  RescheduleInput,
} from "@/lib/validation/schemas";

export const qk = {
  today: (d: string) => ["today", d] as const,
  quests: (status: string) => ["quests", status] as const,
  quest: (id: string) => ["quest", id] as const,
  calendar: (id: string, month: string) => ["calendar", id, month] as const,
  categories: ["categories"] as const,
  sheets: (cat?: string) => ["sheets", cat ?? "all"] as const,
  sheet: (id: string) => ["sheet", id] as const,
  archive: ["archive"] as const,
};

export function useToday() {
  const today = localToday();
  return useQuery({
    queryKey: qk.today(today),
    queryFn: () => api.today(today),
  });
}

export function useQuests(status = "active") {
  const today = localToday();
  return useQuery({
    queryKey: qk.quests(status),
    queryFn: () => api.quests(status, today),
  });
}

export function useQuest(id: string) {
  const today = localToday();
  return useQuery({
    queryKey: qk.quest(id),
    queryFn: () => api.quest(id, today),
    enabled: !!id,
  });
}

export function useCalendar(id: string, month: string) {
  const today = localToday();
  return useQuery({
    queryKey: qk.calendar(id, month),
    queryFn: () => api.calendar(id, month, today),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({ queryKey: qk.categories, queryFn: () => api.categories() });
}

export function useSheets(categoryId?: string) {
  return useQuery({
    queryKey: qk.sheets(categoryId),
    queryFn: () => api.sheets(categoryId),
  });
}

export function useSheet(id?: string) {
  return useQuery({
    queryKey: qk.sheet(id ?? ""),
    queryFn: () => api.sheet(id as string),
    enabled: !!id,
  });
}

export function useArchive() {
  const today = localToday();
  return useQuery({ queryKey: qk.archive, queryFn: () => api.archive(today) });
}

export function useBadges() {
  return useQuery({ queryKey: ["badges"], queryFn: () => api.badges() });
}

export function useInsights() {
  const today = localToday();
  return useQuery({
    queryKey: ["insights", today],
    queryFn: () => api.insights(today),
  });
}

export function useMonthInsights(month: string) {
  return useQuery({
    queryKey: ["insights-month", month],
    queryFn: () => api.monthInsights(month),
    enabled: !!month,
  });
}

/** Invalidate everything that a log/quest change can affect. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["today"] });
    qc.invalidateQueries({ queryKey: ["quests"] });
    qc.invalidateQueries({ queryKey: ["quest"] });
    qc.invalidateQueries({ queryKey: ["calendar"] });
    qc.invalidateQueries({ queryKey: ["archive"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["badges"] });
    qc.invalidateQueries({ queryKey: ["insights"] });
  };
}

export function useLogDay(questId: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: LogInput) => api.log(questId, input),
    onSuccess: invalidate,
  });
}

export function useCreateQuest() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: CreateQuestInput) => api.createQuest(input),
    onSuccess: invalidate,
  });
}

export function usePatchQuest() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      body: { status?: string; name?: string; end_date?: string | null };
    }) => api.patchQuest(vars.id, vars.body),
    onSuccess: invalidate,
  });
}

export function useRescheduleQuest(id: string) {
  const invalidate = useInvalidateAll();
  const today = localToday();
  return useMutation({
    mutationFn: (body: RescheduleInput) => api.reschedule(id, body, today),
    onSuccess: invalidate,
  });
}

export function useDeleteQuest() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api.deleteQuest(id),
    onSuccess: invalidate,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; icon?: string; color?: string }) =>
      api.createCategory(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categories }),
  });
}
