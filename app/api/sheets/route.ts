import { NextResponse, type NextRequest } from "next/server";
import { getAuthed, jsonError } from "@/lib/server/auth";
import { createSheetSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase } = ctx;

  const categoryId = req.nextUrl.searchParams.get("category_id");
  let query = supabase
    .from("sheets")
    .select("*")
    .order("is_preset", { ascending: false })
    .order("name", { ascending: true });
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data: sheets } = await query;

  // Attach item counts (cheap at this scale).
  const ids = (sheets ?? []).map((s) => s.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: items } = await supabase
      .from("sheet_items")
      .select("sheet_id")
      .in("sheet_id", ids);
    for (const it of items ?? []) {
      counts.set(it.sheet_id, (counts.get(it.sheet_id) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    sheets: (sheets ?? []).map((s) => ({
      ...s,
      item_count: counts.get(s.id) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase, user } = ctx;

  const body = await req.json().catch(() => null);
  const parsed = createSheetSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid sheet", 400, parsed.error.flatten());
  }
  const { name, category_id, description, items } = parsed.data;

  const { data: sheet, error } = await supabase
    .from("sheets")
    .insert({
      user_id: user.id,
      name,
      source: "custom",
      category_id: category_id ?? null,
      description: description ?? null,
      is_preset: false,
    })
    .select("*")
    .single();
  if (error || !sheet) return jsonError(error?.message ?? "Failed", 500);

  if (items.length) {
    await supabase.from("sheet_items").insert(
      items.map((it, i) => ({
        user_id: user.id,
        sheet_id: sheet.id,
        title: it.title,
        topic: it.topic ?? null,
        difficulty: it.difficulty ?? null,
        url: it.url ?? null,
        order_index: i,
      })),
    );
  }

  return NextResponse.json({ sheet });
}
