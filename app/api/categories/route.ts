import { NextResponse, type NextRequest } from "next/server";
import { getAuthed, jsonError } from "@/lib/server/auth";
import { createCategorySchema } from "@/lib/validation/schemas";
import type { CategoryView } from "@/lib/api/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase } = ctx;

  const [{ data: cats }, { data: activeQuests }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .order("is_preset", { ascending: false })
      .order("name", { ascending: true }),
    supabase.from("quests").select("category_id").eq("status", "active"),
  ]);
  const counts = new Map<string, number>();
  for (const q of activeQuests ?? []) {
    const id = q.category_id as string | null;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const views: CategoryView[] = (cats ?? []).map((c) => ({
    ...c,
    active_quests: counts.get(c.id) ?? 0,
  }));
  return NextResponse.json({ categories: views });
}

export async function POST(req: NextRequest) {
  const { ctx, res } = await getAuthed();
  if (res) return res;
  const { supabase, user } = ctx;

  const body = await req.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid category", 400, parsed.error.flatten());
  }
  const { name, icon, color } = parsed.data;
  const normalizedColor = color
    ? color.startsWith("#")
      ? color
      : `#${color}`
    : null;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name,
      icon: icon ?? "✨",
      color: normalizedColor ?? "#7c5cff",
      is_preset: false,
    })
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ category: { ...data, active_quests: 0 } });
}
