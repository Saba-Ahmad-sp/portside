import type { ApiErrorCode, PageMeta } from "@/lib/api/responses";

/**
 * Portside — the browser's only door to the server.
 *
 * No component calls `fetch` directly and no component unwraps an error
 * envelope by hand. Everything the UI reads or writes goes through here, which
 * is what makes "the browser never queries the database" a structural fact
 * rather than a convention someone has to remember.
 */

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | "NETWORK";
  /** Field-level messages from a 422, ready to feed back into a form. */
  readonly fields?: Record<string, string[]>;

  constructor(
    status: number,
    code: ApiErrorCode | "NETWORK",
    message: string,
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  /** True when the caller lacks permission, as opposed to being logged out. */
  get isForbidden() {
    return this.status === 403;
  }

  get isUnauthenticated() {
    return this.status === 401;
  }
}

type Envelope<T> = { data: T; meta?: PageMeta };

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<Envelope<T>> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiClientError(
      0,
      "NETWORK",
      "Could not reach the server. Check your connection and try again.",
    );
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload?.error;
    throw new ApiClientError(
      response.status,
      error?.code ?? "INTERNAL",
      error?.message ?? "Something went wrong.",
      error?.fields,
    );
  }

  return payload as Envelope<T>;
}

/** Serialises a filter object into a query string, dropping empties. */
export function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  /** Unwraps to the payload. Use when there is no pagination envelope. */
  async get<T>(path: string): Promise<T> {
    return (await request<T>(path)).data;
  },

  /** Keeps `meta`. Use for list endpoints. */
  async getPage<T>(path: string): Promise<{ data: T; meta: PageMeta }> {
    const result = await request<T>(path);
    return { data: result.data, meta: result.meta as PageMeta };
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    return (await request<T>(path, { method: "POST", body: JSON.stringify(body) })).data;
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    return (await request<T>(path, { method: "PATCH", body: JSON.stringify(body) })).data;
  },
};
