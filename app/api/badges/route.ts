import { NextResponse } from "next/server";
import { getAuthed } from "@/lib/server/auth";
import { buildBadges } from "@/lib/server/badges";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const data = await buildBadges(ctx.supabase, ctx.user.id);
  return NextResponse.json(data);
}
