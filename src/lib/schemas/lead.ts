import { z } from "zod";

/**
 * Portside — validation schemas.
 *
 * Written in Zod 4 syntax: string formats are top-level factories (`z.email()`
 * rather than the deprecated `z.string().email()`), and message customisation
 * uses `{ error: ... }` rather than the removed `{ message: ... }`.
 *
 * Each schema is used TWICE — by React Hook Form in the browser for instant
 * feedback, and by the route handler on the server for enforcement. Client
 * validation is a convenience; the server never trusts it.
 */

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;

export const LEAD_SOURCES = ["website", "manual", "referral"] as const;

/* -------------------------------------------------------------------------- */
/*  Public capture form                                                        */
/*                                                                             */
/*  Kept deliberately short — five required fields. A nine-field public form   */
/*  is a conversion killer. Everything else is optional enrichment.            */
/* -------------------------------------------------------------------------- */

export const publicLeadSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "Please enter your name." })
    .max(120),
  email: z.email({ error: "Please enter a valid email address." }).max(200),
  company: z
    .string()
    .trim()
    .min(2, { error: "Please enter your company name." })
    .max(160),
  country: z
    .string()
    .trim()
    .min(2, { error: "Please tell us which country you are importing to." })
    .max(80),
  message: z
    .string()
    .trim()
    .min(10, { error: "A sentence or two about what you need, please." })
    .max(2000),

  // Optional enrichment
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  productInterest: z.string().trim().max(200).optional().or(z.literal("")),
  quantity: z.coerce
    .number({ error: "Quantity must be a number." })
    .int({ error: "Quantity must be a whole number." })
    .positive({ error: "Quantity must be greater than zero." })
    .max(100_000_000)
    .optional(),

  /**
   * Honeypot. Bots fill every field they find; humans never see this one.
   * A non-empty value is silently accepted and discarded, so a bot cannot
   * detect that it was caught.
   */
  website: z.string().max(0).optional().or(z.literal("")),
});

/**
 * Two types, because `z.coerce` means what a form holds is not what the schema
 * produces: `quantity` is a string in the input the user types and a number
 * once parsed. React Hook Form models this with separate input/output generics,
 * so both are exported rather than collapsing them with z.infer.
 */
export type PublicLeadValues = z.input<typeof publicLeadSchema>;
export type PublicLeadInput = z.output<typeof publicLeadSchema>;

/* -------------------------------------------------------------------------- */
/*  Authenticated mutations                                                    */
/* -------------------------------------------------------------------------- */

/** Editing a lead's details. Every field optional — this is a PATCH. */
export const leadUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.email().max(200),
    phone: z.string().trim().max(40).nullable(),
    company: z.string().trim().min(2).max(160),
    country: z.string().trim().min(2).max(80),
    productInterest: z.string().trim().max(200).nullable(),
    quantity: z.coerce.number().int().positive().max(100_000_000).nullable(),
    estValueUsd: z.coerce.number().nonnegative().max(1_000_000_000).nullable(),
    message: z.string().trim().max(2000).nullable(),
    status: z.enum(LEAD_STATUSES),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: "Provide at least one field to update.",
  });

export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

/** Admin-only. `assigneeId: null` unassigns the lead. */
export const assignmentSchema = z.object({
  assigneeId: z.uuid({ error: "assigneeId must be a valid user id." }).nullable(),
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;

export const noteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: "A note cannot be empty." })
    .max(4000, { error: "Notes are limited to 4000 characters." }),
});

export type NoteInput = z.infer<typeof noteSchema>;

/* -------------------------------------------------------------------------- */
/*  List query parameters                                                      */
/*                                                                             */
/*  Coerced from strings because they arrive as URL search params. A bad value */
/*  here is a 400 (malformed request), not a 422 (invalid body).               */
/* -------------------------------------------------------------------------- */

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export const leadQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE, { error: `limit cannot exceed ${MAX_PAGE_SIZE}.` })
    .default(DEFAULT_PAGE_SIZE),
  status: z.enum(LEAD_STATUSES).optional(),
  assigneeId: z
    .union([z.uuid(), z.literal("unassigned")])
    .optional(),
  q: z.string().trim().max(120).optional(),
  sort: z
    .enum(["created_at", "-created_at", "updated_at", "-updated_at"])
    .default("-created_at"),
});

export type LeadQuery = z.infer<typeof leadQuerySchema>;

/**
 * Parses `URLSearchParams` into a validated query object, dropping empty
 * strings so `?status=` behaves like an absent filter rather than an error.
 */
export function parseLeadQuery(searchParams: URLSearchParams) {
  const raw: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (value !== "") raw[key] = value;
  }
  return leadQuerySchema.safeParse(raw);
}
