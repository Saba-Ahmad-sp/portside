"use client";

import { Loader2, UserRound } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignLead, useMembers } from "@/lib/hooks/use-lead";
import { can, type PermissionUser } from "@/lib/permissions";
import type { ActorDTO, MemberDTO } from "@/lib/types";

const UNASSIGNED = "unassigned";

/**
 * Assignment control.
 *
 * Renders as a select for an admin and as plain text for everyone else — the
 * decision comes from the same `can()` the server uses, so the control is
 * absent exactly when the API would return 403.
 *
 * Hiding it is a courtesy, not the protection: PATCH /api/leads/:id/assignment
 * refuses a member independently, which is what the test suite asserts.
 */
export function AssigneeControl({
  leadId,
  assignee,
  viewer,
  members,
}: {
  leadId: string;
  assignee: ActorDTO;
  viewer: PermissionUser;
  members: MemberDTO[];
}) {
  const mayAssign = can(viewer, "lead:assign");
  const assign = useAssignLead(leadId);

  // Only fetch the directory if this viewer is allowed to have it.
  const { data: fetchedMembers } = useMembers(mayAssign, members);
  const options = fetchedMembers ?? members;

  if (!mayAssign) {
    return (
      <div>
        <p className="label-manifest">Owner</p>
        <p className="mt-1.5 flex items-center gap-2 text-sm">
          <UserRound className="size-3.5 text-muted-foreground" aria-hidden />
          {assignee ? assignee.fullName : "Unassigned"}
        </p>
      </div>
    );
  }

  const admins = options.filter((member) => member.role === "admin");
  const staff = options.filter((member) => member.role === "member");

  return (
    <div>
      <label htmlFor="assignee" className="label-manifest">
        Owner
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <Select
          value={assignee?.id ?? UNASSIGNED}
          disabled={assign.isPending}
          onValueChange={(value) =>
            assign.mutate(value === UNASSIGNED ? null : value)
          }
        >
          <SelectTrigger id="assignee" className="h-9 w-full bg-card text-sm">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {staff.length > 0 && <SelectSeparator />}
            {staff.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.fullName}
              </SelectItem>
            ))}
            {admins.length > 0 && <SelectSeparator />}
            {admins.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.fullName}
                <span className="ml-2 font-mono text-[0.625rem] tracking-[0.1em] text-muted-foreground uppercase">
                  admin
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {assign.isPending && (
          <Loader2
            className="size-4 shrink-0 animate-spin text-muted-foreground"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
