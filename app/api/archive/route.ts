import { NextResponse, type NextRequest } from "next/server";
import { getAuthed } from "@/lib/server/auth";
import { buildArchive } from "@/lib/server/archive";
import { readToday } from "@/lib/server/today-param";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase } = ctx;
  const today = readToday(req);
  const entries = await buildArchive(supabase, today);
  return NextResponse.json({ entries });
}
