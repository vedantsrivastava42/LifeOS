import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthedContext {
  supabase: SupabaseClient;
  user: User;
}

/**
 * Resolve the signed-in user for a Route Handler. Returns either the authed
 * context or a ready-to-return 401 response.
 */
export async function getAuthed(): Promise<
  { ctx: AuthedContext; res?: never } | { ctx?: never; res: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ctx: { supabase, user } };
}

export function jsonError(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ error: message, details: extra }, { status });
}
