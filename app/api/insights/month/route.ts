import { NextResponse, type NextRequest } from "next/server";
import { getAuthed, jsonError } from "@/lib/server/auth";
import { buildMonthInsights } from "@/lib/server/insights";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const month = req.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return jsonError("Expected ?month=yyyy-MM", 400);
  }
  const data = await buildMonthInsights(ctx.supabase, ctx.user.id, month);
  return NextResponse.json(data);
}
