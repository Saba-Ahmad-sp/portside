import type { LeadQuery } from "@/lib/schemas/lead";

/**
 * Portside — TanStack Query cache keys, defined once.
 *
 * Keys written inline at call sites are how caches quietly desync: a mutation
 * invalidates `["leads"]` while a hook subscribed to `["lead-list"]` never
 * hears about it, and the table silently shows stale rows. Declaring them here
 * means invalidation and subscription cannot disagree.
 *
 * Hierarchical on purpose — invalidating `leads.all` cascades to every list and
 * detail beneath it.
 */
export const queryKeys = {
  leads: {
    all: ["leads"] as const,

    lists: () => [...queryKeys.leads.all, "list"] as const,
    list: (filters: Partial<LeadQuery>) =>
      [...queryKeys.leads.lists(), filters] as const,

    details: () => [...queryKeys.leads.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.leads.details(), id] as const,

    notes: (id: string) => [...queryKeys.leads.detail(id), "notes"] as const,
    activities: (id: string) =>
      [...queryKeys.leads.detail(id), "activities"] as const,
  },

  members: {
    all: ["members"] as const,
  },
} as const;
