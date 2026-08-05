"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateLead } from "@/lib/hooks/use-lead";
import { formatValue } from "@/lib/format";
import { can, type PermissionUser } from "@/lib/permissions";

/**
 * The estimated value of a lead.
 *
 * Owned by the sales team, not the buyer — the public capture form deliberately
 * does not ask for it. A buyer knows what they want; what the order is worth is
 * a judgement someone makes after qualifying the enquiry, and revises as they
 * learn more.
 *
 * Editable by whoever can edit the lead: the assigned rep, or an admin. Same
 * `can()` the server enforces with, so the pencil is absent exactly when the
 * API would refuse.
 *
 * Every change is recorded in the activity trail. This is the number the
 * dashboard's open-value total is built from, so "who tripled this, and when"
 * needs an answer.
 */
export function EstimatedValueField({
  leadId,
  value,
  assignedTo,
  viewer,
}: {
  leadId: string;
  value: number | null;
  assignedTo: string | null;
  viewer: PermissionUser;
}) {
  const update = useUpdateLead(leadId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value === null ? "" : String(value));

  const mayEdit = can(viewer, "lead:update", { assignedTo });

  if (!mayEdit) {
    return (
      <span data-numeric className="font-mono text-sm">
        {formatValue(value)}
      </span>
    );
  }

  function start() {
    setDraft(value === null ? "" : String(value));
    setEditing(true);
  }

  async function save() {
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : Number(trimmed);

    if (next !== null && (!Number.isFinite(next) || next < 0)) {
      toast.error("Enter a whole number of rupees, or leave it blank.");
      return;
    }

    if (next === value) {
      setEditing(false);
      return;
    }

    try {
      await update.mutateAsync({ estValueInr: next });
      setEditing(false);
    } catch {
      // useUpdateLead surfaces the server's message; keep the draft so the
      // typed figure is not lost.
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={start}
        className="group inline-flex items-center gap-1.5 rounded-sm font-mono text-sm transition-colors hover:text-brass focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-none"
        title="Set the estimated order value"
      >
        <span data-numeric>{formatValue(value)}</span>
        {/*
          Always visible, dimmed. A pencil that only appears on hover is
          undiscoverable — nobody hovers a number to find out it is editable,
          and on touch there is no hover at all. Hovering brightens it and the
          whole control turns brass.
        */}
        <Pencil
          className="size-3 opacity-45 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        />
        <span className="sr-only">Edit estimated value</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span aria-hidden className="font-mono text-sm text-muted-foreground">
        ₹
      </span>
      <Input
        autoFocus
        type="number"
        min={0}
        step={1000}
        inputMode="numeric"
        value={draft}
        aria-label="Estimated order value in rupees"
        disabled={update.isPending}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void save();
          if (event.key === "Escape") setEditing(false);
        }}
        className="no-spinner h-12 w-48 bg-card font-mono text-base"
      />

      {/* Stacked, so they take one column beside the field rather than
          pushing it narrower. */}
      <div className="flex shrink-0 flex-col gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-6 hover:text-status-won"
          aria-label="Save estimated value"
          disabled={update.isPending}
          onClick={() => void save()}
        >
          {update.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="size-3.5" aria-hidden />
          )}
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-6 text-muted-foreground hover:text-status-lost"
          aria-label="Cancel"
          disabled={update.isPending}
          onClick={() => setEditing(false)}
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
