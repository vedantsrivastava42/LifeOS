import { NextResponse, type NextRequest } from "next/server";
import { getAuthed, jsonError } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase } = ctx;
  const { id } = await params;

  const { data: sheet } = await supabase
    .from("sheets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!sheet) return jsonError("Sheet not found", 404);

  const { data: items } = await supabase
    .from("sheet_items")
    .select("*")
    .eq("sheet_id", id)
    .order("order_index", { ascending: true });

  return NextResponse.json({ sheet, items: items ?? [] });
}
