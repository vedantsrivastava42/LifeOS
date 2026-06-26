import { z } from "zod";

/** What the classifier returns for free-text logging. */
export const aiLogPlan = z.object({
  logs: z
    .array(
      z.object({
        quest_id: z.string(),
        action: z.enum(["tick", "items", "count", "note"]),
        item_labels: z.array(z.string()).optional(),
        count: z.number().int().positive().max(1000).optional(),
        note: z.string().max(2000).optional(),
      }),
    )
    .default([]),
  unmatched: z.array(z.string()).default([]),
});
export type AiLogPlan = z.infer<typeof aiLogPlan>;

/** What the generator returns for quest creation from a prompt. */
export const aiQuestPlan = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["streak", "target", "milestone", "daily"]),
  category_id: z.string(),
  end_date: z.string().nullable().optional(),
  sheet_id: z.string().nullable().optional(),
  target: z
    .object({
      target_count: z.number().int().positive().max(100000),
      pace_per_week: z.number().int().positive().max(1000),
    })
    .optional(),
  streak: z
    .object({
      rest_days: z.array(z.number().int().min(0).max(6)).default([]),
      tick_xp: z.number().int().min(0).max(100000).optional(),
    })
    .optional(),
  milestone_items: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        xp: z.number().int().min(0).max(100000).optional(),
      }),
    )
    .optional(),
  daily_items: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        category_id: z.string().nullable().optional(),
        xp: z.number().int().min(0).max(100000).optional(),
      }),
    )
    .optional(),
});
export type AiQuestPlan = z.infer<typeof aiQuestPlan>;
