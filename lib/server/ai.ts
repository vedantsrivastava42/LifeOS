import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestItemRow, QuestRow } from "@/lib/domain/types";
import type { DateStr } from "@/lib/domain/dates";
import type { AiLogResponse } from "@/lib/api/types";
import { aiLogPlan, aiQuestPlan } from "@/lib/validation/ai";
import { createQuestSchema } from "@/lib/validation/schemas";
import { createQuest, loadCategoryMap } from "@/lib/server/quests";
import { logDay } from "@/lib/server/log";

const MODELS = {
  gen: process.env.AI_MODEL_GEN || "gpt-4.1",
  classify: process.env.AI_MODEL_CLASSIFY || "gpt-4o-mini",
};

export function aiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI isn't configured yet — add OPENAI_API_KEY to your environment.",
    );
  }
  return new OpenAI({ apiKey });
}

/** Run a chat completion that must return a JSON object, and parse it. */
async function jsonComplete<T>(
  model: string,
  system: string,
  user: string,
): Promise<T> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  let content = res.choices[0]?.message?.content?.trim() ?? "{}";
  if (content.startsWith("```")) {
    content = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(content) as T;
}

// ── AI activity logging ─────────────────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function aiLog(
  supabase: SupabaseClient,
  userId: string,
  text: string,
  today: DateStr,
): Promise<AiLogResponse> {
  const { data: questRows } = await supabase
    .from("quests")
    .select("*")
    .eq("status", "active")
    .lte("start_date", today);
  const quests = (questRows ?? []) as QuestRow[];
  if (quests.length === 0) {
    return { logged: [], unmatched: [text.trim()].filter(Boolean), total_xp: 0 };
  }

  const ids = quests.map((q) => q.id);
  const [{ data: itemRows }, catMap] = await Promise.all([
    supabase
      .from("quest_items")
      .select("id, quest_id, label, kind, is_done, due_date")
      .in("quest_id", ids),
    loadCategoryMap(supabase),
  ]);
  const itemsByQuest = new Map<string, QuestItemRow[]>();
  for (const it of (itemRows ?? []) as QuestItemRow[]) {
    const arr = itemsByQuest.get(it.quest_id);
    if (arr) arr.push(it);
    else itemsByQuest.set(it.quest_id, [it]);
  }

  // Build a compact catalogue for the model.
  const catalogue = quests.map((q) => {
    const cat = catMap.get(q.category_id ?? "");
    const open = (itemsByQuest.get(q.id) ?? [])
      .filter((i) => !i.is_done && i.kind !== "contest")
      .slice(0, 25)
      .map((i) => i.label);
    return {
      id: q.id,
      name: q.name,
      type: q.type,
      category: cat?.name ?? null,
      sample_items: open,
    };
  });

  const system = [
    "You convert a person's free-text description of what they did today into log actions for their quests.",
    "Only use quest_id values from the provided list. Match each thing they mention to the most relevant quest.",
    "Action rules:",
    "- streak quests → action 'tick'.",
    "- target quests → 'items' with item_labels if they named specific problems/things; or 'count' with a number if they only said how many.",
    "- milestone/daily quests → 'items' with item_labels matching the tasks/steps.",
    "- a reflection with no concrete items → 'note' with the text.",
    "Put anything that doesn't map to any quest into 'unmatched'.",
    "Respond ONLY with JSON: { \"logs\": [{ \"quest_id\", \"action\", \"item_labels\"?, \"count\"?, \"note\"? }], \"unmatched\": [string] }.",
  ].join("\n");

  const user = `Quests:\n${JSON.stringify(catalogue, null, 2)}\n\nWhat they did today:\n"""${text}"""`;

  const raw = await jsonComplete<unknown>(MODELS.classify, system, user);
  const plan = aiLogPlan.parse(raw);

  const logged: AiLogResponse["logged"] = [];
  let total_xp = 0;

  for (const entry of plan.logs) {
    const quest = quests.find((q) => q.id === entry.quest_id);
    if (!quest) continue;
    const items = itemsByQuest.get(quest.id) ?? [];

    let input:
      | { kind: "tick"; today: string }
      | { kind: "note"; today: string; note: string }
      | {
          kind: "items";
          today: string;
          itemIds: string[];
          newItems: {
            label: string;
            kind: "checklist" | "daily" | "custom";
          }[];
        }
      | null = null;

    if (entry.action === "tick") {
      input = { kind: "tick", today };
    } else if (entry.action === "note") {
      input = { kind: "note", today, note: entry.note ?? text };
    } else if (entry.action === "count") {
      const n = entry.count ?? 1;
      const pick = items
        .filter((i) => !i.is_done && (i.kind === "problem" || i.kind === "custom"))
        .sort((a, b) =>
          a.due_date === today ? -1 : b.due_date === today ? 1 : 0,
        )
        .slice(0, n)
        .map((i) => i.id);
      input = { kind: "items", today, itemIds: pick, newItems: [] };
    } else if (entry.action === "items") {
      const labels = entry.item_labels ?? [];
      const itemIds: string[] = [];
      const newItems: {
        label: string;
        kind: "checklist" | "daily" | "custom";
      }[] = [];
      const newKind =
        quest.type === "milestone"
          ? "checklist"
          : quest.type === "daily"
            ? "daily"
            : "custom";
      for (const label of labels) {
        const nl = norm(label);
        const match = items.find(
          (i) =>
            !i.is_done &&
            (norm(i.label).includes(nl) || nl.includes(norm(i.label))),
        );
        if (match) itemIds.push(match.id);
        else newItems.push({ label, kind: newKind });
      }
      input = { kind: "items", today, itemIds, newItems };
    }

    if (!input) continue;
    if (input.kind === "items" && !input.itemIds.length && !input.newItems.length)
      continue;

    try {
      const res = await logDay(supabase, userId, quest, input);
      total_xp += res.xp_gained;
      const detail =
        input.kind === "items"
          ? `${input.itemIds.length + input.newItems.length} logged`
          : input.kind === "tick"
            ? "ticked today"
            : "noted";
      logged.push({ quest: quest.name, xp: res.xp_gained, detail });
    } catch {
      // Skip a quest that failed (e.g. nothing to log) — don't fail the batch.
    }
  }

  return { logged, unmatched: plan.unmatched, total_xp };
}

// ── AI quest creation ───────────────────────────────────────────────────────

export async function aiCreateQuest(
  supabase: SupabaseClient,
  userId: string,
  prompt: string,
  today: DateStr,
): Promise<{ id: string }> {
  const [{ data: cats }, { data: sheets }] = await Promise.all([
    supabase.from("categories").select("id, name"),
    supabase.from("sheets").select("id, name, category_id"),
  ]);

  const system = [
    "You design a single quest from a person's description, for a personal quest tracker.",
    "Quest types:",
    "- streak: a daily habit (gym, journaling). Use type 'streak'.",
    "- target: reach a number by doing items (e.g. solve 200 DSA problems). Use 'target' with target {target_count, pace_per_week}; attach a sheet via sheet_id if one fits.",
    "- milestone: a one-off checklist of steps. Use 'milestone' with milestone_items [{label, xp?}].",
    "- daily: a recurring daily checklist that resets each day. Use 'daily' with daily_items [{label, category_id?, xp?}].",
    "Pick category_id from the provided categories (use the best fit). For DSA goals, prefer the DSA category and a matching sheet_id if available.",
    "Only use ids that exist in the provided lists. Omit fields that don't apply to the chosen type.",
    "Respond ONLY with JSON matching: { name, type, category_id, end_date?, sheet_id?, target?, streak?, milestone_items?, daily_items? }.",
  ].join("\n");

  const user = [
    `Categories:\n${JSON.stringify(cats ?? [], null, 2)}`,
    `Sheets:\n${JSON.stringify(sheets ?? [], null, 2)}`,
    `Request:\n"""${prompt}"""`,
  ].join("\n\n");

  const raw = await jsonComplete<unknown>(MODELS.gen, system, user);
  const plan = aiQuestPlan.parse(raw);

  const input = {
    name: plan.name,
    category_id: plan.category_id,
    type: plan.type,
    start_date: today,
    end_date: plan.end_date ?? null,
    sheet_id: plan.type === "target" ? plan.sheet_id ?? null : null,
    target: plan.target,
    attach_sheet: plan.type === "target" && !!plan.sheet_id,
    streak: plan.streak
      ? {
          rest_days: plan.streak.rest_days ?? [],
          freezes_max: 3,
          freezes_available: 1,
          tick_xp: plan.streak.tick_xp,
        }
      : undefined,
    milestone_items: plan.milestone_items,
    daily_items: plan.daily_items,
  };

  const parsed = createQuestSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      "Couldn't build a valid quest from that — try rephrasing with a clearer goal.",
    );
  }
  return createQuest(supabase, userId, parsed.data);
}
