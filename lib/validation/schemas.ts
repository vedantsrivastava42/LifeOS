import { z } from "zod";

export const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected yyyy-MM-dd");

/**
 * Permissive UUID: any 8-4-4-4-12 hex string. We can't use z.uuid() because the
 * seeded preset rows use non-RFC UUIDs (e.g. 00000000-…-0002, version nibble 0),
 * which Zod 4's strict .uuid() rejects. Postgres still stores/compares them fine.
 */
export const uuidish = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Invalid id",
  );
export const difficulty = z.enum(["easy", "medium", "hard"]);
export const questItemKind = z.enum(["problem", "contest", "checklist", "custom"]);

export const createQuestSchema = z
  .object({
    name: z.string().min(1).max(120),
    category_id: uuidish,
    type: z.enum(["streak", "target", "milestone", "daily"]),
    start_date: dateStr,
    end_date: dateStr.nullable().optional(),
    sheet_id: uuidish.nullable().optional(),

    // target-specific
    target: z
      .object({
        target_count: z.number().int().positive().max(100000),
        pace_per_week: z.number().int().positive().max(1000),
      })
      .optional(),
    attach_sheet: z.boolean().optional(),
    // Day-by-day schedule (assigns specific problems to specific dates).
    schedule: z
      .object({
        enabled: z.boolean(),
        cadence: z.enum(["daily", "weekdays", "weekends", "custom"]),
        custom_weekdays: z
          .array(z.number().int().min(0).max(6))
          .optional(),
        // Topic-sequenced plan: array order = the sequence the user chose,
        // each topic carrying its own pace and how many of its problems to do.
        topics: z
          .array(
            z.object({
              topic: z.string().min(1).max(80),
              pace_per_week: z.number().int().positive().max(1000),
              count: z.number().int().min(0).max(100000),
            }),
          )
          .optional(),
      })
      .optional(),
    contests: z
      .object({ weekly: z.boolean(), biweekly: z.boolean() })
      .optional(),

    // streak-specific
    streak: z
      .object({
        rest_days: z.array(z.number().int().min(0).max(6)).default([]),
        freezes_max: z.number().int().min(0).max(10).default(3),
        freezes_available: z.number().int().min(0).max(10).default(1),
        tick_xp: z.number().int().min(0).max(100000).optional(),
      })
      .optional(),

    // milestone-specific: each step can carry its own XP reward.
    milestone_items: z
      .array(
        z.object({
          label: z.string().min(1).max(200),
          xp: z.number().int().min(0).max(100000).optional(),
        }),
      )
      .optional(),

    // daily-specific: recurring tasks, each with optional category + XP.
    daily_items: z
      .array(
        z.object({
          label: z.string().min(1).max(200),
          category_id: uuidish.nullable().optional(),
          xp: z.number().int().min(0).max(100000).optional(),
          difficulty: difficulty.nullable().optional(),
        }),
      )
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "target" && !v.target) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["target"],
        message: "Target quests need a target_count and pace_per_week",
      });
    }
    if (v.type === "daily" && !v.daily_items?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["daily_items"],
        message: "A daily quest needs at least one task",
      });
    }
    if (v.type === "milestone" && !v.milestone_items?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["milestone_items"],
        message: "A milestone needs at least one step",
      });
    }
    if (v.end_date && v.end_date < v.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "End date must be on or after the start date",
      });
    }
  });
export type CreateQuestInput = z.infer<typeof createQuestSchema>;

export const patchQuestSchema = z
  .object({
    status: z.enum(["active", "completed", "archived"]).optional(),
    name: z.string().min(1).max(120).optional(),
    end_date: dateStr.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields to update");
export type PatchQuestInput = z.infer<typeof patchQuestSchema>;

/**
 * Re-plan an existing target quest's schedule: reorder topics, retune per-topic
 * pace, change cadence. Only undone problems get re-dated; finished ones stay.
 */
export const rescheduleSchema = z.object({
  cadence: z.enum(["daily", "weekdays", "weekends", "custom"]),
  custom_weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  // Where the re-plan begins (defaults to today on the server).
  start_date: dateStr.optional(),
  // Topics in the order to do them; pace per topic. A topic omitted here (or
  // with enabled:false) has its undone problems unscheduled (moved to backlog).
  topics: z
    .array(
      z.object({
        topic: z.string().min(1).max(80),
        pace_per_week: z.number().int().positive().max(1000),
        enabled: z.boolean().optional(),
      }),
    )
    .min(1),
});
export type RescheduleInput = z.infer<typeof rescheduleSchema>;

export const logSchema = z
  .object({
    date: dateStr.optional(),
    today: dateStr,
    kind: z.enum(["tick", "items", "note"]),
    itemIds: z.array(uuidish).optional(),
    newItems: z
      .array(
        z.object({
          label: z.string().min(1).max(200),
          difficulty: difficulty.nullable().optional(),
          topic: z.string().max(80).nullable().optional(),
          kind: questItemKind.optional(),
        }),
      )
      .optional(),
    note: z.string().max(2000).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "note" && !v.note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "A note log needs some text",
      });
    }
    if (
      v.kind === "items" &&
      !(v.itemIds?.length || v.newItems?.length)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["itemIds"],
        message: "Nothing to log",
      });
    }
  });
export type LogInput = z.infer<typeof logSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().max(8).optional(),
  color: z
    .string()
    .regex(/^#?[0-9a-fA-F]{3,8}$/)
    .optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const createSheetSchema = z.object({
  name: z.string().min(1).max(120),
  category_id: uuidish.nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        topic: z.string().max(80).nullable().optional(),
        difficulty: difficulty.nullable().optional(),
        url: z.string().url().nullable().optional(),
      }),
    )
    .default([]),
});
export type CreateSheetInput = z.infer<typeof createSheetSchema>;
