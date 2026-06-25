import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthed, jsonError } from "@/lib/server/auth";
import { patchQuestSchema } from "@/lib/validation/schemas";
import type { QuestItemRow, QuestRow } from "@/lib/domain/types";
import type { QuestDetail } from "@/lib/api/types";
import { loadCategoryMap, summarizeQuest } from "@/lib/server/quests";
import { readToday } from "@/lib/server/today-param";

export const dynamic = "force-dynamic";

async function loadQuest(
  supabase: SupabaseClient,
  id: string,
): Promise<QuestRow | null> {
  const { data } = await supabase
    .from("quests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as QuestRow) ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase } = ctx;
  const { id } = await params;
  const today = readToday(req);

  const quest = await loadQuest(supabase, id);
  if (!quest) return jsonError("Quest not found", 404);

  const catMap = await loadCategoryMap(supabase);
  const { summary, items } = await summarizeQuest(
    supabase,
    quest,
    catMap.get(quest.category_id ?? "") ?? null,
    today,
  );

  const { data: logs } = await supabase
    .from("day_logs")
    .select("log_date, kind, note, item_ids")
    .eq("quest_id", id)
    .order("log_date", { ascending: false })
    .limit(30);

  const detail: QuestDetail = {
    ...summary,
    config: quest.config,
    sheet_id: quest.sheet_id,
    items: items as QuestItemRow[],
    recent_logs: (logs ?? []).map((l) => ({
      log_date: l.log_date as string,
      kind: l.kind as string,
      note: (l.note as string) ?? null,
      item_ids: (l.item_ids as string[]) ?? [],
    })),
  };
  return NextResponse.json({ quest: detail });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase } = ctx;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = patchQuestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid update", 400, parsed.error.flatten());
  }

  const { data, error } = await supabase
    .from("quests")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ quest: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase } = ctx;
  const { id } = await params;

  const { error } = await supabase.from("quests").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
