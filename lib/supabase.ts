import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-only admin client that bypasses RLS.
 * Use only in API routes and server actions — never in client components.
 */
export function supabaseAdmin() {
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient<Database>(url, service, {
    auth: { persistSession: false },
  });
}
