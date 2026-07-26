"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/**
 * Confirmation for actions that are hard to undo.
 *
 * Used sparingly, on purpose. Confirming everything trains people to click
 * through without reading, which makes the dialog worse than useless — it adds
 * friction to every action and stops protecting the one that mattered.
 *
 * The rule applied in this app:
 *
 *   Advancing a lead along the pipeline        no dialog — frequent, and one
 *                                              click puts it back
 *   Assigning or reassigning                   no dialog — reversible, and the
 *                                              activity trail records who did it
 *   Marking a lead lost                        DIALOG — terminal state, and a
 *                                              member cannot undo it (the API
 *                                              answers 409)
 *   Reopening a closed lead                    DIALOG — admin-only decision
 *                                              that reverses a closed outcome
 *
 * Reversible things are immediate. Irreversible things ask.
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending = false,
  destructive = false,
}: {
  /**
   * The element that opens the dialog. Passed to Base UI's `render` prop,
   * which merges the trigger behaviour onto your element rather than wrapping
   * it in another button.
   */
  trigger: React.ReactElement<Record<string, unknown>>;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  isPending?: boolean;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{title}</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              // The mutation reports its own outcome through a toast, so the
              // dialog closes immediately rather than holding the user there
              // while a request they cannot influence completes.
              onConfirm();
              setOpen(false);
            }}
            className={cn(
              destructive &&
                "bg-status-lost text-background hover:bg-status-lost/90",
            )}
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
