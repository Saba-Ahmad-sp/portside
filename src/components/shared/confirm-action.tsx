"use client";

import { useState } from "react";
import { Loader2, type LucideIcon } from "lucide-react";

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
 * Confirmation for actions worth pausing on.
 *
 * Same shape as the shared ConfirmDialog in my other projects: a question for
 * a title, a description that says what will actually happen, an icon, and a
 * confirm button that names the action rather than saying "OK". A button
 * labelled "Confirm" makes the user re-read the title to find out what they
 * are agreeing to.
 *
 * Used sparingly on purpose. Confirming everything trains people to click
 * through without reading, which adds friction to every action and stops
 * protecting the one that mattered. The line drawn here is consequence:
 *
 *   Advancing along the pipeline   no dialog — frequent, one click undoes it
 *   Marking a lead lost            DIALOG — terminal; a member cannot undo it
 *   Reopening a closed lead        DIALOG — reverses a closed outcome
 *   Reassigning a lead             DIALOG — it takes work off someone's desk,
 *                                  and they are not in the room to be asked
 *
 * Works either as a trigger wrapper or fully controlled, because reassignment
 * is driven by a select rather than a button.
 */
export function ConfirmAction({
  trigger,
  open,
  onOpenChange,
  icon: Icon,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  isPending = false,
  destructive = false,
}: {
  /** Element that opens the dialog. Omit when driving `open` yourself. */
  trigger?: React.ReactElement<Record<string, unknown>>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  icon?: LucideIcon;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  /** Called when dismissed, so a controlled caller can drop pending state. */
  onCancel?: () => void;
  isPending?: boolean;
  destructive?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;

  function setOpen(next: boolean) {
    if (!next) onCancel?.();
    if (isControlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <AlertDialogTrigger render={trigger} />}

      <AlertDialogContent>
        <AlertDialogHeader>
          {Icon && (
            <span
              aria-hidden
              className={cn(
                "mb-1 flex size-9 items-center justify-center rounded-md",
                destructive
                  ? "bg-status-lost/10 text-status-lost"
                  : "bg-brass/10 text-brass",
              )}
            >
              <Icon className="size-4" />
            </span>
          )}
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
              // dialog closes immediately rather than holding the user here
              // while a request they cannot influence completes.
              onConfirm();
              if (isControlled) onOpenChange?.(false);
              else setUncontrolledOpen(false);
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
