import "server-only";

import type { NextRequest } from "next/server";
import type { ZodType } from "zod";

import { ApiError, fieldErrors } from "@/lib/api/responses";

/**
 * Portside — shared route-handler plumbing.
 *
 * Six handlers all need to do the same three things: await the dynamic route
 * params, confirm the id is actually a UUID, and parse a JSON body against a
 * schema. Written inline, that is the same fifteen lines copy-pasted six times,
 * and the first time someone forgets the UUID check they get a Postgres syntax
 * error surfaced as a 500 instead of a clean 400.
 *
 * Extracting it means each handler reduces to: authenticate, delegate to the
 * service, return. Nothing to forget.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves `params` (async in Next.js 16) and validates the id.
 *
 * Bracketed route folders are user input. Postgres rejects a malformed UUID
 * with a syntax error, which would surface as a 500; validating here turns it
 * into an honest 400 before the query is ever built.
 */
export async function routeId(
  params: Promise<{ id: string }>,
): Promise<string> {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    throw ApiError.badRequest("The lead id must be a UUID.");
  }

  return id;
}

/**
 * Reads and validates a JSON request body.
 *
 * Distinguishes the two failure modes the API contract cares about:
 *   400  the body is not JSON at all
 *   422  the body is JSON but does not satisfy the schema
 */
export async function readJson<T>(
  request: NextRequest,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw ApiError.badRequest("Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw ApiError.validation(fieldErrors(parsed.error));
  }

  return parsed.data;
}
