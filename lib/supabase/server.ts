import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * SSR Supabase client — publishable key, RLS-enforced — bound to the request
 * cookies. Use in Server Components, Route Handlers, and Server Actions for
 * user-scoped work. `setAll` is a no-op in Server Components (middleware refreshes
 * the session), which is why it is wrapped in try/catch.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore; middleware keeps
          // the session fresh.
        }
      },
    },
  });
}

/**
 * Service-role Supabase client — secret key, BYPASSES RLS. SERVER-ONLY. Use only
 * for trusted work with no user session: webhooks, the resolver,
 * discount-code claiming, and store provisioning. Never import from client code
 * and never expose SUPABASE_SECRET_KEY to the browser (§13).
 */
export function createSupabaseServiceRoleClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY!;
  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
