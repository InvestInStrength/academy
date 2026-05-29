/**
 * Public environment variables (safe to read in the browser).
 *
 * These are inlined by Next.js at build time because they are prefixed with
 * `NEXT_PUBLIC_`. The Supabase anon key is intentionally public — row level
 * security is what protects the data, not the key.
 *
 * The service-role key is deliberately NOT read here. It must never reach the
 * browser. Read it only inside `src/lib/supabase/service.ts` (server-only).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const publicEnv = {
  supabaseUrl,
  supabaseAnonKey,
} as const;
