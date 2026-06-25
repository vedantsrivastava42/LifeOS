import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Server-only; never import into client
 * code. Not required for Phase 1's tap-to-log paths (those run through the
 * user's RLS-scoped client); provided for privileged seeding/admin work.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
