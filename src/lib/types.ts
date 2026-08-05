/**
 * Portside — shared domain types and Data Transfer Objects.
 *
 * Pure types, no imports beyond the permission module. Safe on both sides of
 * the client/server boundary.
 *
 * These are DTOs, not table rows. The Next.js data-security guide is explicit:
 * "return only the necessary data that will be used in your application, and
 * not entire objects." The repository maps database rows into these shapes, so
 * a column added to a table is never accidentally serialised to the browser.
 */

import type { LeadStatus, Role } from "@/lib/permissions";

export type { LeadStatus, Role };

export type LeadSource = "website" | "manual" | "referral";

export type ActivityType =
  | "lead_created"
  | "assigned"
  | "unassigned"
  | "status_changed"
  | "note_added"
  | "value_changed";

/** A colleague, as shown in an assignee dropdown or the team page. */
export type MemberDTO = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
};

/** The minimal reference to a user embedded in a lead, note or activity. */
export type ActorDTO = Pick<MemberDTO, "id" | "fullName"> | null;

/** A row in the leads table view. Deliberately smaller than LeadDTO. */
export type LeadListItemDTO = {
  id: string;
  fullName: string;
  company: string;
  country: string;
  email: string;
  status: LeadStatus;
  source: LeadSource;
  productInterest: string | null;
  estValueInr: number | null;
  assignee: ActorDTO;
  createdAt: string;
  updatedAt: string;
};

/** The full lead, as shown on the detail page. */
export type LeadDTO = LeadListItemDTO & {
  phone: string | null;
  quantity: number | null;
  message: string | null;
  createdBy: ActorDTO;
};

export type NoteDTO = {
  id: string;
  body: string;
  author: ActorDTO;
  createdAt: string;
};

export type ActivityDTO = {
  id: string;
  type: ActivityType;
  actor: ActorDTO;
  fromValue: string | null;
  toValue: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

/** Pagination envelope returned alongside every list response. */
export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PageMeta;
};

/* -------------------------------------------------------------------------- */
/*  Display helpers                                                            */
/* -------------------------------------------------------------------------- */

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Website",
  manual: "Added manually",
  referral: "Referral",
};
