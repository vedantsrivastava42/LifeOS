import { NextResponse, type NextRequest } from "next/server";
import { getAuthed, jsonError } from "@/lib/server/auth";
import { rescheduleSchema } from "@/lib/validation/schemas";
import { rescheduleQuest } from "@/lib/server/quests";
import { readToday } from "@/lib/server/today-param";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase } = ctx;
  const { id } = await params;
  const today = readToday(req);

  const body = await req.json().catch(() => null);
  const parsed = rescheduleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid schedule", 400, parsed.error.flatten());
  }

  try {
    const result = await rescheduleQuest(supabase, id, parsed.data, today);
    return NextResponse.json(result);
  } catch (e) {
    return jsonError((e as Error).message ?? "Failed to reschedule", 500);
  }
}
