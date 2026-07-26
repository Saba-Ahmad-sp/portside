import "server-only";

/**
 * Portside — server environment.
 *
 * The Next.js data-security guide is explicit: "only the Data Access Layer
 * should access process.env. This keeps secrets from being exposed to other
 * parts of the application." Nothing outside this file and the Supabase
 * clients reads a secret.
 *
 * Reading is lazy and validated, so a missing variable fails loudly with the
 * variable's name instead of surfacing later as an opaque Supabase 401.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const serverEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  /**
   * Bypasses Row Level Security. Used for exactly two things: writing the
   * activity trail, and the seed script. Never sent to the browser.
   */
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
} as const;
