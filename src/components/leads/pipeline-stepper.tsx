"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUpdateStatus } from "@/lib/hooks/use-lead";
import {
  PIPELINE,
  can,
  canTransition,
  isTerminal,
  type LeadStatus,
  type PermissionUser,
} from "@/lib/permissions";
import { STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The pipeline as a voyage: an ordered track a lead moves along, not a dropdown
 * of unrelated values. The brief asks for a "status pipeline", and stages with
 * a visible order and direction are what makes it one.
 *
 * Every stage is clickable, so moving a lead is one click rather than
 * open-select-choose-save. Which stages are clickable comes from the same
 * `can()` and `canTransition()` the server enforces with — a member who cannot
 * reopen a closed lead sees that stage disabled, and the API refuses it too
 * with a 409 if they try anyway.
 */
export function PipelineStepper({
  leadId,
  status,
  assignedTo,
  viewer,
}: {
  leadId: string;
  status: LeadStatus;
  assignedTo: string | null;
  viewer: PermissionUser;
}) {
  const reduceMotion = useReducedMotion();
  const updateStatus = useUpdateStatus(leadId);

  const mayEdit = can(viewer, "lead:updateStatus", { assignedTo });
  const currentIndex = PIPELINE.indexOf(status);
  const isLost = status === "lost";

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="label-manifest">Pipeline</h2>
        {updateStatus.isPending && (
          <span className="flex items-center gap-1.5 font-mono text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Saving
          </span>
        )}
      </div>

      <ol className="flex flex-wrap items-stretch gap-1" role="list">
        {PIPELINE.map((stage, index) => {
          const reached = !isLost && index <= currentIndex;
          const isCurrent = !isLost && index === currentIndex;
          const allowed =
            mayEdit && stage !== status && canTransition(viewer, status, stage);

          return (
            <li key={stage} className="min-w-0 flex-1">
              <button
                type="button"
                disabled={!allowed || updateStatus.isPending}
                onClick={() => updateStatus.mutate(stage)}
                aria-current={isCurrent ? "step" : undefined}
                title={
                  allowed
                    ? `Move to ${STATUS_LABELS[stage]}`
                    : isCurrent
                      ? "Current stage"
                      : "You cannot move this lead there"
                }
                className={cn(
                  "group relative w-full rounded-md border px-3 py-2.5 text-left transition-colors",
                  isCurrent
                    ? "border-brass bg-brass/10"
                    : reached
                      ? "border-border bg-accent/50"
                      : "border-border bg-card",
                  allowed && "cursor-pointer hover:border-brass/60 hover:bg-accent",
                  !allowed && "cursor-default",
                  updateStatus.isPending && "opacity-60",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-3.5 shrink-0 items-center justify-center rounded-full",
                      reached
                        ? `bg-status-${stage}`
                        : "border border-border bg-transparent",
                    )}
                  >
                    {reached && !isCurrent && (
                      <Check className="size-2 text-background" strokeWidth={4} />
                    )}
                  </span>
                  <span
                    className={cn(
                      "truncate font-mono text-[0.625rem] tracking-[0.1em] uppercase",
                      isCurrent
                        ? "text-brass"
                        : reached
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {STATUS_LABELS[stage]}
                  </span>
                </span>

                {isCurrent && (
                  <motion.span
                    aria-hidden
                    layoutId="pipeline-current"
                    initial={false}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 380, damping: 32 }
                    }
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brass"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Lost sits outside the track — it is an exit, not a stage. */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        {isLost ? (
          <p className="text-xs text-status-lost">
            This lead was marked lost.
            {!can(viewer, "lead:updateStatus", { assignedTo })
              ? ""
              : " Reopening it is an admin decision."}
          </p>
        ) : (
          <>
            <p className="flex-1 text-xs text-muted-foreground">
              Not going anywhere? Close it out rather than leaving it to rot in
              the pipeline.
            </p>
            {mayEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate("lost")}
                className="border-status-lost/40 text-status-lost hover:bg-status-lost/10 hover:text-status-lost"
              >
                Mark as lost
              </Button>
            )}
          </>
        )}

        {isTerminal(status) && can(viewer, "lead:assign") && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate("contacted")}
            className="text-muted-foreground"
          >
            Reopen
          </Button>
        )}
      </div>
    </div>
  );
}
