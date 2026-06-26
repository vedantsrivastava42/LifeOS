import { NextResponse, type NextRequest } from "next/server";
import { getAuthed } from "@/lib/server/auth";
import { buildInsights } from "@/lib/server/insights";
import { readToday } from "@/lib/server/today-param";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const today = readToday(req);
  const data = await buildInsights(ctx.supabase, ctx.user.id, today);
  return NextResponse.json(data);
}
