import { NextResponse, type NextRequest } from "next/server";
import { getAuthed } from "@/lib/server/auth";
import { buildToday } from "@/lib/server/today";
import { readToday } from "@/lib/server/today-param";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase, user } = ctx;
  const today = readToday(req);
  const data = await buildToday(supabase, user.id, today);
  return NextResponse.json(data);
}
