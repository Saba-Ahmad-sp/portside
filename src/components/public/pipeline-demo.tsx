"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, MessageSquare, Sparkles, UserPlus } from "lucide-react";

import { PIPELINE } from "@/lib/permissions";
import { STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A lead working its way down the desk, on a loop.
 *
 * A marketing page for a CRM should show the CRM. This is the actual pipeline,
 * the actual stage colours and the actual activity-trail vocabulary — pulled
 * from the same constants the application uses, so it cannot drift into
 * showing something the product does not do.
 *
 * Honest by construction: if a stage is added to PIPELINE, this picks it up.
 */

const SCRIPT = [
  {
    stage: 0,
    icon: Sparkles,
    line: "Lead created from the public enquiry form",
    actor: "Website",
  },
  {
    stage: 0,
    icon: UserPlus,
    line: "Saba assigned this lead to Priya Nair",
    actor: "Saba Ahmad",
  },
  {
    stage: 1,
    icon: Check,
    line: "Priya moved this from New to Contacted",
    actor: "Priya Nair",
  },
  {
    stage: 2,
    icon: MessageSquare,
    line: "Priya added a note",
    actor: "Priya Nair",
  },
  {
    stage: 3,
    icon: Check,
    line: "Priya moved this from Qualified to Proposal",
    actor: "Priya Nair",
  },
  {
    stage: 4,
    icon: Check,
    line: "Priya moved this from Proposal to Won",
    actor: "Priya Nair",
  },
] as const;

export function PipelineDemo() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Reduced motion still advances — it just does not animate. A frozen
    // screenshot would tell the story less well than a calm one.
    const timer = setInterval(
      () => setStep((current) => (current + 1) % SCRIPT.length),
      2600,
    );
    return () => clearInterval(timer);
  }, []);

  const current = SCRIPT[step];
  const stageIndex = current.stage;

  return (
    <div className="relative w-full max-w-md rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30 p-5 backdrop-blur-sm">
      {/* Lead header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-display text-lg text-sidebar-foreground">
            Gulf Star General Trading
          </p>
          <p className="mt-0.5 truncate text-xs text-sidebar-foreground/55">
            Khalid Al Mansoori · United Arab Emirates
          </p>
        </div>
        <p data-numeric className="shrink-0 font-mono text-sm text-brass">
          ₹1.5Cr
        </p>
      </div>

      {/* Pipeline track */}
      <ol className="mt-5 flex gap-1" aria-hidden>
        {PIPELINE.map((stage, index) => {
          const reached = index <= stageIndex;
          const isCurrent = index === stageIndex;

          return (
            <li key={stage} className="min-w-0 flex-1">
              <motion.div
                animate={{
                  opacity: reached ? 1 : 0.3,
                }}
                transition={{ duration: reduceMotion ? 0 : 0.4 }}
                className="space-y-1.5"
              >
                <div className="h-0.5 w-full overflow-hidden rounded-full bg-sidebar-border">
                  <motion.div
                    initial={false}
                    animate={{ scaleX: reached ? 1 : 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.5,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{ originX: 0 }}
                    className={cn("h-full w-full", `bg-status-${stage}`)}
                  />
                </div>
                <span
                  className={cn(
                    "block truncate font-mono text-[0.5625rem] tracking-[0.1em] uppercase",
                    isCurrent
                      ? "text-brass"
                      : "text-sidebar-foreground/45",
                  )}
                >
                  {STATUS_LABELS[stage]}
                </span>
              </motion.div>
            </li>
          );
        })}
      </ol>

      {/* Activity line */}
      <div className="mt-5 flex min-h-[2.75rem] items-start gap-3 border-t border-sidebar-border/60 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-start gap-3"
          >
            <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-brass">
              <current.icon className="size-2.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs leading-snug text-sidebar-foreground/80">
                {current.line}
              </p>
              <p className="mt-0.5 font-mono text-[0.625rem] text-sidebar-foreground/40">
                just now
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-4 font-mono text-[0.5625rem] tracking-[0.14em] text-sidebar-foreground/30 uppercase">
        Nobody typed any of this
      </p>
    </div>
  );
}
