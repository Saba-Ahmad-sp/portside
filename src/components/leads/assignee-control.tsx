"use client";

import { useState } from "react";
import { Loader2, UserRound, UserRoundCheck, UserRoundX } from "lucide-react";

import { ConfirmAction } from "@/components/shared/confirm-action";

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

  /** The choice made in the select, held until it is confirmed. */
  const [pending, setPending] = useState<string | null>(null);

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

  const pendingMember = pending && pending !== UNASSIGNED
    ? options.find((member) => member.id === pending)
    : null;

  const currentName = assignee?.fullName ?? null;
  const nextName = pendingMember?.fullName ?? null;

  return (
    <div>
      <label htmlFor="assignee" className="label-manifest">
        Owner
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <Select
          value={assignee?.id ?? UNASSIGNED}
          disabled={assign.isPending}
          // Stage the choice rather than applying it. Reassigning takes work
          // off someone's desk and they are not in the room to be asked, so it
          // is worth a beat — and because the trigger's label is driven by the
          // saved assignee, the select does not visually lie in the meantime.
          onValueChange={(value) => setPending(value)}
        >
          <SelectTrigger id="assignee" className="h-9 w-full bg-card text-sm">
            {/*
              Explicit children rather than letting SelectValue resolve the
              label itself. Radix maps value -> the text of a mounted item, so
              in the moment after a reassignment - when the options list is
              re-rendering - it finds no match and falls back to printing the
              raw UUID. The name is known here, so say it.
            */}
            <SelectValue placeholder="Unassigned">
              {assignee?.fullName ?? "Unassigned"}
            </SelectValue>
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

      <ConfirmAction
        open={pending !== null}
        onOpenChange={(next) => !next && setPending(null)}
        onCancel={() => setPending(null)}
        icon={pendingMember ? UserRoundCheck : UserRoundX}
        title={
          pendingMember
            ? currentName
              ? "Reassign this lead?"
              : "Assign this lead?"
            : "Remove the owner?"
        }
        description={
          pendingMember ? (
            currentName ? (
              <>
                It moves off <strong>{currentName}</strong>&rsquo;s desk and onto{" "}
                <strong>{nextName}</strong>&rsquo;s. {currentName} will no
                longer be able to see it, and the change is recorded against
                your name.
              </>
            ) : (
              <>
                <strong>{nextName}</strong> becomes the owner and it appears in
                their book. Recorded in the activity trail against your name.
              </>
            )
          ) : (
            <>
              It goes back to the unassigned pile.{" "}
              {currentName ? <strong>{currentName}</strong> : "The current owner"}{" "}
              will no longer be able to see it.
            </>
          )
        }
        confirmLabel={
          pendingMember
            ? currentName
              ? "Reassign"
              : "Assign"
            : "Unassign"
        }
        isPending={assign.isPending}
        onConfirm={() => {
          assign.mutate(pending === UNASSIGNED ? null : pending);
          setPending(null);
        }}
      />
    </div>
  );
}
