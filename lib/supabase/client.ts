import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Browser Supabase client — publishable key, RLS-enforced. Memoized so the whole
 * tab shares one auth/session instance (avoids duplicate token refresh listeners).
 */
export function createSupabaseBrowserClient() {
  if (!client) client = createBrowserClient<Database>(url, publishableKey);
  return client;
}
