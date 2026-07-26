/**
 * Portside — HTTP response helpers.
 *
 * Eight route handlers share one envelope and one status-code vocabulary, so
 * the contract in the README is guaranteed to match what the API actually
 * returns. Route handlers never construct a NextResponse by hand.
 *
 * Status code discipline (documented in the README as deliberate):
 *
 *   200  read/update succeeded
 *   201  resource created
 *   400  malformed request or query parameters
 *   401  not authenticated
 *   403  visible to you, but this action is denied
 *   404  does not exist, OR you are not allowed to know it exists
 *   409  valid body, invalid state transition
 *   422  body failed schema validation
 *
 * The 403/404 split matters. Returning 403 for a lead a member cannot see
 * would confirm the record exists, turning sequential IDs into an enumeration
 * oracle. A member requesting someone else's lead gets 404; a member trying to
 * assign a lead they *can* see gets 403.
 */

import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "INTERNAL";

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiSuccess<T> = { data: T; meta?: PageMeta };
export type ApiFailure = {
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string[]>;
  };
};

/* -------------------------------------------------------------------------- */
/*  Errors the service layer throws                                            */
/* -------------------------------------------------------------------------- */

/**
 * Thrown by services and repositories. The route wrapper turns it into the
 * right status code, so authorization logic never has to know about HTTP.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields?: Record<string, string[]>;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  static badRequest(message = "Malformed request.") {
    return new ApiError(400, "BAD_REQUEST", message);
  }

  static unauthenticated(message = "Authentication required.") {
    return new ApiError(401, "UNAUTHENTICATED", message);
  }

  static forbidden(message = "You do not have permission to perform this action.") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  /**
   * Used both for records that genuinely do not exist and for records the
   * caller is not allowed to know about. Do not replace this with 403 for the
   * latter — see the note at the top of this file.
   */
  static notFound(message = "Not found.") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message = "That change conflicts with the current state.") {
    return new ApiError(409, "CONFLICT", message);
  }

  static validation(fields: Record<string, string[]>, message = "Validation failed.") {
    return new ApiError(422, "VALIDATION_FAILED", message, fields);
  }
}

/* -------------------------------------------------------------------------- */
/*  Success responses                                                          */
/* -------------------------------------------------------------------------- */

export function ok<T>(data: T) {
  return NextResponse.json<ApiSuccess<T>>({ data }, { status: 200 });
}

export function created<T>(data: T) {
  return NextResponse.json<ApiSuccess<T>>({ data }, { status: 201 });
}

export function paginated<T>(data: T[], meta: PageMeta) {
  return NextResponse.json<ApiSuccess<T[]>>({ data, meta }, { status: 200 });
}

/* -------------------------------------------------------------------------- */
/*  Failure responses                                                          */
/* -------------------------------------------------------------------------- */

export function fail(error: ApiError) {
  return NextResponse.json<ApiFailure>(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    },
    { status: error.status },
  );
}

/**
 * Zod 4: `.flatten()` and `.format()` are deprecated. We read `issues`
 * directly and build a `field -> messages` map the forms can consume.
 */
export function fieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/* -------------------------------------------------------------------------- */
/*  Route wrapper                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Wraps a route handler so thrown ApiErrors become correct responses and
 * anything unexpected becomes a 500 without leaking internals to the client.
 *
 * Every route handler is wrapped, which is why none of them contain a
 * try/catch or a hand-written status code.
 */
export function withRoute<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) return fail(error);

      // Unexpected: log server-side, return an opaque 500.
      console.error("[portside] unhandled route error", error);
      return fail(
        new ApiError(500, "INTERNAL", "Something went wrong on our end."),
      );
    }
  };
}
