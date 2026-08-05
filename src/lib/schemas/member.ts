import { z } from "zod";

/**
 * Access toggle for a team member.
 *
 * Only `isActive`. Role is deliberately not accepted here — promoting someone
 * to admin is a different decision with different consequences, and the
 * database grant is column-scoped to match, so a wider body could not take
 * effect even if the schema allowed it.
 */
export const memberAccessSchema = z.object({
  isActive: z.boolean({ error: "isActive must be true or false." }),
});

export type MemberAccessInput = z.infer<typeof memberAccessSchema>;
