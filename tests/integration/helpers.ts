import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

/**
 * Shared plumbing for the integration tier.
 *
 * These tests speak HTTP to a running instance and a real database. Nothing is
 * mocked, because the thing being verified is that the service layer and Row
 * Level Security agree — a mocked database would only prove the service layer
 * agrees with itself.
 *
 * Sessions are obtained from Supabase and sent as `Authorization: Bearer`,
 * which is the same path an external API client takes. That the tests can
 * authenticate at all is itself proof the API is usable outside a browser.
 */

/** Matches `npm run dev`. CI overrides this with TEST_BASE_URL. */
export const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3100";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PASSWORD = process.env.SEED_PASSWORD ?? "PortsideDemo!2026";

export const ACCOUNTS = {
  admin: "admin@portside.demo",
  priya: "priya@portside.demo",
  rahul: "rahul@portside.demo",
} as const;

export type AccountName = keyof typeof ACCOUNTS;

const tokenCache = new Map<string, string>();

/** Signs in and returns an access token, cached per email for the run. */
export async function tokenFor(account: AccountName): Promise<string> {
  const email = ACCOUNTS[account];
  const cached = tokenCache.get(email);
  if (cached) return cached;

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Could not sign in as ${email}. Has the seed script been run? (npm run seed)`,
    );
  }

  const { access_token } = await response.json();
  tokenCache.set(email, access_token);
  return access_token;
}

type ApiOptions = {
  as?: AccountName;
  method?: string;
  body?: unknown;
};

export type ApiResult<T = unknown> = {
  status: number;
  body: T;
};

/** One call shape for every request in the suite. */
export async function callApi<T = unknown>(
  path: string,
  { as, method = "GET", body }: ApiOptions = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (as) headers.Authorization = `Bearer ${await tokenFor(as)}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  return {
    status: response.status,
    body: (text ? JSON.parse(text) : null) as T,
  };
}

/** The id of the current user, read back from a lead they own. */
export async function firstLeadOf(account: AccountName) {
  const { body } = await callApi<{ data: Array<{ id: string; assignee: { id: string; fullName: string } | null }> }>(
    "/api/leads?limit=1",
    { as: account },
  );
  return body.data[0];
}
