"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRoundCheck, UserRoundX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { ApiClientError, api } from "@/lib/api/client";
import type { MemberDTO } from "@/lib/types";

/**
 * Grant or revoke a colleague's access.
 *
 * Deliberately not user creation. `is_active` already existed in the schema and
 * was already enforced — can() refuses every action for an inactive user and
 * the DAL rejects their session — but nothing in the app could set it. This
 * makes an enforced rule reachable rather than adding a new one.
 *
 * Rendered only for members. The server refuses the rest independently — a
 * non-admin caller, an admin target, and removing your own access — so hiding
 * the control is convenience, not the protection. Server messages are surfaced
 * verbatim, because "Only members' access can be changed here" tells someone
 * what the rule is and a generic failure does not.
 */
export function MemberAccessToggle({ member }: { member: MemberDTO }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const busy = saving || isPending;
  const next = !member.isActive;

  async function apply() {
    setSaving(true);
    try {
      await api.patch<MemberDTO>(`/api/members/${member.id}/access`, {
        isActive: next,
      });

      toast.success(
        next
          ? `${member.fullName} can sign in again`
          : `${member.fullName}'s access removed`,
      );
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error("Could not change access", {
        description:
          error instanceof ApiClientError
            ? error.message
            : "Please try again in a moment.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfirmAction
      icon={next ? UserRoundCheck : UserRoundX}
      destructive={!next}
      title={next ? "Restore access?" : "Remove access?"}
      description={
        next ? (
          <>
            <strong>{member.fullName}</strong> will be able to sign in again and
            see the leads assigned to them.
          </>
        ) : (
          <>
            <strong>{member.fullName}</strong> will be signed out and refused at
            every screen and endpoint until access is restored. Their leads and
            history are untouched — nothing is deleted, and you can reverse this
            at any time.
          </>
        )
      }
      confirmLabel={next ? "Restore access" : "Remove access"}
      isPending={busy}
      onConfirm={apply}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          className={
            next
              ? "text-muted-foreground hover:text-status-won"
              : "text-muted-foreground hover:text-status-lost"
          }
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : next ? (
            <UserRoundCheck className="size-3.5" aria-hidden />
          ) : (
            <UserRoundX className="size-3.5" aria-hidden />
          )}
          {next ? "Restore" : "Remove access"}
        </Button>
      }
    />
  );
}
