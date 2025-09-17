import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for client-side (browser) components.
 * This client uses the public anonymous key and is safe to use in the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Creates a Supabase client for server-side admin actions.
 * This requires the SERVICE_ROLE_KEY and should only be used in secure
 * server-side environments (e.g., API routes with auth checks).
 */
export function createAdminClient() {
    // Note: The `createClient` function from `@supabase/supabase-js` is used here
    // because the SSR version is designed for user session management, not admin tasks.
    // Admin tasks typically don't involve cookie-based session handling in the same way.
    // We must ensure this is only used where there's no risk of exposing the service key.
    const { createClient } = require("@supabase/supabase-js");

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}
