import { NextResponse, type NextRequest } from "next/server";
import { getAuthed, jsonError } from "@/lib/server/auth";
import type { QuestRow } from "@/lib/domain/types";
import { buildCalendar } from "@/lib/server/calendar";
import { readToday } from "@/lib/server/today-param";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase } = ctx;
  const { id } = await params;
  const today = readToday(req);

  const month =
    req.nextUrl.searchParams.get("month") ?? today.slice(0, 7); // yyyy-MM

  const { data: quest } = await supabase
    .from("quests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!quest) return jsonError("Quest not found", 404);

  const cal = await buildCalendar(supabase, quest as QuestRow, month, today);
  return NextResponse.json(cal);
}
