import { NextResponse, type NextRequest } from "next/server";
import { getAuthed, jsonError } from "@/lib/server/auth";
import { logSchema } from "@/lib/validation/schemas";
import type { QuestRow } from "@/lib/domain/types";
import { logDay } from "@/lib/server/log";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase, user } = ctx;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = logSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid log", 400, parsed.error.flatten());
  }

  const { data: quest } = await supabase
    .from("quests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!quest) return jsonError("Quest not found", 404);
  if ((quest as QuestRow).status !== "active") {
    return jsonError("Quest is not active", 409);
  }

  try {
    const result = await logDay(supabase, user.id, quest as QuestRow, parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to log", 400);
  }
}
