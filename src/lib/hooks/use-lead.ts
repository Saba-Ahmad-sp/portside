"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ApiClientError, api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import type { LeadStatus } from "@/lib/permissions";
import type { ActivityDTO, LeadDTO, MemberDTO, NoteDTO } from "@/lib/types";

/**
 * Portside — data hooks for the lead detail page.
 *
 * Server Components render the page's first paint from the service layer, and
 * these take over for the interactive parts: changing status, assigning, adding
 * a note. Each is seeded with `initialData` from that server render, so there
 * is no spinner on arrival and no second fetch of data we already have.
 *
 * Every mutation invalidates through `queryKeys`, so a status change refreshes
 * the activity trail without either side knowing about the other. That is the
 * whole reason the keys live in one module.
 */

/* -------------------------------------------------------------------------- */
/*  Queries                                                                    */
/* -------------------------------------------------------------------------- */

export function useLead(id: string, initialData: LeadDTO) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => api.get<LeadDTO>(`/api/leads/${id}`),
    initialData,
  });
}

export function useNotes(id: string, initialData: NoteDTO[]) {
  return useQuery({
    queryKey: queryKeys.leads.notes(id),
    queryFn: () => api.get<NoteDTO[]>(`/api/leads/${id}/notes`),
    initialData,
  });
}

export function useActivities(id: string, initialData: ActivityDTO[]) {
  return useQuery({
    queryKey: queryKeys.leads.activities(id),
    queryFn: () => api.get<ActivityDTO[]>(`/api/leads/${id}/activities`),
    initialData,
  });
}

export function useMembers(enabled: boolean, initialData: MemberDTO[] = []) {
  return useQuery({
    queryKey: queryKeys.members.all,
    queryFn: () => api.get<MemberDTO[]>("/api/members"),
    initialData: initialData.length ? initialData : undefined,
    enabled,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Anything that changes a lead also writes to the activity trail, so both are
 * refreshed together. `router.refresh()` re-runs the Server Components too,
 * which is what keeps the leads table behind this page in step.
 */
function useLeadInvalidation(id: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.activities(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() }),
    ]);
    router.refresh();
  };
}

/** Surfaces the API's own message — 403 and 409 both say something useful. */
function reportError(fallback: string) {
  return (error: unknown) => {
    toast.error(fallback, {
      description:
        error instanceof ApiClientError
          ? error.message
          : "Please try again in a moment.",
    });
  };
}

export function useUpdateStatus(id: string) {
  const invalidate = useLeadInvalidation(id);

  return useMutation({
    mutationFn: (status: LeadStatus) =>
      api.patch<LeadDTO>(`/api/leads/${id}`, { status }),
    onSuccess: async (lead) => {
      await invalidate();
      toast.success(`Moved to ${lead.status}`);
    },
    onError: reportError("Could not change the status"),
  });
}

export function useAssignLead(id: string) {
  const invalidate = useLeadInvalidation(id);

  return useMutation({
    mutationFn: (assigneeId: string | null) =>
      api.patch<LeadDTO>(`/api/leads/${id}/assignment`, { assigneeId }),
    onSuccess: async (lead) => {
      await invalidate();
      toast.success(
        lead.assignee
          ? `Assigned to ${lead.assignee.fullName}`
          : "Lead unassigned",
      );
    },
    onError: reportError("Could not reassign this lead"),
  });
}

export function useAddNote(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useLeadInvalidation(id);

  return useMutation({
    mutationFn: (body: string) =>
      api.post<NoteDTO>(`/api/leads/${id}/notes`, { body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.leads.notes(id),
      });
      await invalidate();
    },
    onError: reportError("Could not save that note"),
  });
}
