import { NextResponse, type NextRequest } from "next/server";
import { getAuthed, jsonError } from "@/lib/server/auth";
import { aiConfigured, aiLog } from "@/lib/server/ai";
import { readToday } from "@/lib/server/today-param";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  if (!aiConfigured()) {
    return jsonError("AI isn't configured — add OPENAI_API_KEY.", 400);
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return jsonError("Tell me what you did first.", 400);

  const today = readToday(req);
  try {
    const data = await aiLog(ctx.supabase, ctx.user.id, text, today);
    return NextResponse.json(data);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "AI logging failed", 500);
  }
}
