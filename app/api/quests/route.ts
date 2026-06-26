import { NextResponse, type NextRequest } from "next/server";
import { getAuthed, jsonError } from "@/lib/server/auth";
import { createQuestSchema } from "@/lib/validation/schemas";
import type { QuestRow } from "@/lib/domain/types";
import { createQuest, loadCategoryMap, summarizeQuests } from "@/lib/server/quests";
import { readToday } from "@/lib/server/today-param";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase } = ctx;
  const today = readToday(req);

  const status = req.nextUrl.searchParams.get("status") ?? "active";
  const categoryId = req.nextUrl.searchParams.get("category_id");

  let query = supabase
    .from("quests")
    .select("*")
    .order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  if (categoryId) query = query.eq("category_id", categoryId);

  // Quests list + category map are independent → fetch in parallel.
  const [{ data }, catMap] = await Promise.all([query, loadCategoryMap(supabase)]);
  const quests = (data ?? []) as QuestRow[];

  const summaries = await summarizeQuests(supabase, quests, catMap, today);
  return NextResponse.json({ quests: summaries });
}

export async function POST(req: NextRequest) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase, user } = ctx;

  const body = await req.json().catch(() => null);
  const parsed = createQuestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid quest", 400, parsed.error.flatten());
  }

  try {
    const { id } = await createQuest(supabase, user.id, parsed.data);
    return NextResponse.json({ id });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to create", 500);
  }
}
