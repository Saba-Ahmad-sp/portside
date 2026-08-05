"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { Anchor, ArrowDown, ArrowUpRight } from "lucide-react";

import { PipelineDemo } from "@/components/public/pipeline-demo";
import { RevealWords } from "@/components/shared/reveal";
import { PIPELINE } from "@/lib/permissions";
import { STATUS_LABELS } from "@/lib/types";

/**
 * Hero.
 *
 * Four moving parts, each earning its place:
 *
 *  - the headline assembles word by word
 *  - two gradient orbs drift with the pointer, and lag it via a spring, so the
 *    depth reads as parallax rather than as something glued to the cursor
 *  - the whole hero drifts up and fades as you scroll away from it
 *  - the product demonstrates itself, on a loop
 *
 * Everything is gated on `useReducedMotion`. Anyone who has asked their OS for
 * less motion gets a still, complete page — not a broken one.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const PROOF = [
  { value: "1", label: "shared desk" },
  { value: "6", label: "pipeline stages" },
  { value: "100%", label: "of changes logged" },
];

export function Hero() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  // Pointer position, normalised to -0.5 … 0.5 around the centre.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  // Springs, so the orbs trail the cursor instead of snapping to it.
  const driftX = useSpring(pointerX, { stiffness: 60, damping: 22, mass: 0.8 });
  const driftY = useSpring(pointerY, { stiffness: 60, damping: 22, mass: 0.8 });

  const orbOneX = useTransform(driftX, (v) => v * 56);
  const orbOneY = useTransform(driftY, (v) => v * 40);
  const orbTwoX = useTransform(driftX, (v) => v * -34);
  const orbTwoY = useTransform(driftY, (v) => v * -26);
  const gridX = useTransform(driftX, (v) => v * -14);
  const gridY = useTransform(driftY, (v) => v * -10);

  // Scroll-linked exit.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const wordmarkY = useTransform(scrollYProgress, [0, 1], [0, 130]);

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  return (
    <header
      ref={ref}
      onPointerMove={handlePointerMove}
      className="relative isolate overflow-hidden bg-sidebar text-sidebar-foreground"
    >
      {/* --------------------------------------------------- atmosphere */}
      <motion.div
        aria-hidden
        style={reduceMotion ? undefined : { x: gridX, y: gridY }}
        className="chart-grid absolute inset-0 scale-110 opacity-60"
      />

      <motion.div
        aria-hidden
        style={reduceMotion ? undefined : { x: orbOneX, y: orbOneY }}
        className="absolute -top-56 left-1/3 size-[46rem] rounded-full bg-brass/12 blur-[130px]"
      />
      <motion.div
        aria-hidden
        style={reduceMotion ? undefined : { x: orbTwoX, y: orbTwoY }}
        className="absolute -right-40 -bottom-64 size-[38rem] rounded-full bg-status-qualified/12 blur-[120px]"
      />

      {/* Oversized vertical wordmark, bled off the left edge. */}
      <motion.span
        aria-hidden
        style={reduceMotion ? undefined : { y: wordmarkY }}
        className="pointer-events-none absolute -left-6 top-1/2 hidden -translate-y-1/2 font-display text-[13rem] leading-none font-semibold tracking-tighter text-sidebar-foreground/[0.04] select-none xl:block"
      >
        <span className="block [writing-mode:vertical-rl] [text-orientation:upright]">
          PORTSIDE
        </span>
      </motion.span>

      {/* ---------------------------------------------------------- nav */}
      <nav className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <motion.span
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex items-center gap-2.5"
        >
          <Anchor className="size-5 text-brass" aria-hidden />
          <span className="font-display text-lg tracking-tight">Portside</span>
        </motion.span>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        >
          <Link
            href="/login"
            className="group inline-flex items-center gap-1.5 rounded-full border border-sidebar-border px-4 py-2 font-mono text-[0.6875rem] tracking-[0.14em] text-sidebar-foreground/80 uppercase transition-colors hover:border-brass/60 hover:text-brass"
          >
            Team sign in
            <ArrowUpRight
              className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </motion.div>
      </nav>

      {/* -------------------------------------------------------- body */}
      <motion.div
        style={reduceMotion ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative mx-auto grid w-full max-w-7xl gap-14 px-6 pt-14 pb-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-16 lg:pt-20 lg:pb-28"
      >
        <div>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="label-manifest text-brass/90"
          >
            Export &amp; import · trade enquiries
          </motion.p>

          <h1 className="mt-5 font-display text-[2.6rem] leading-[1.03] sm:text-6xl lg:text-[4.4rem]">
            <RevealWords text="Every enquiry" delay={0.25} />
            <br />
            <RevealWords
              text="lands somewhere."
              delay={0.4}
              wordClassName={() => "text-brass"}
            />
          </h1>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.72, ease: EASE }}
            className="mt-6 max-w-lg text-base leading-relaxed text-sidebar-foreground/70 sm:text-lg"
          >
            The desk where import enquiries stop getting lost in a WhatsApp
            group. Capture the requirement, source overseas, work the pipeline
            — and keep a complete record of who did what, and when.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.84, ease: EASE }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <a
              href="#enquiry"
              className="group inline-flex items-center gap-2 rounded-full bg-brass px-6 py-3 font-mono text-[0.6875rem] tracking-[0.14em] text-brass-foreground uppercase transition-transform hover:scale-[1.02] active:scale-100"
            >
              Send an enquiry
              <ArrowDown
                className="size-3.5 transition-transform group-hover:translate-y-0.5"
                aria-hidden
              />
            </a>
            <Link
              href="/login"
              className="rounded-full px-5 py-3 font-mono text-[0.6875rem] tracking-[0.14em] text-sidebar-foreground/70 uppercase underline-offset-4 transition-colors hover:text-sidebar-foreground hover:underline"
            >
              Or sign in to the desk
            </Link>
          </motion.div>

          <motion.dl
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-12 flex flex-wrap items-start gap-x-10 gap-y-5"
          >
            {PROOF.map((item) => (
              <div key={item.label}>
                <dd data-numeric className="font-display text-3xl text-brass">
                  {item.value}
                </dd>
                <dt className="label-manifest mt-0.5 text-sidebar-foreground/55">
                  {item.label}
                </dt>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* The product, demonstrating itself. */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
          className="flex justify-center lg:justify-end"
        >
          <PipelineDemo />
        </motion.div>
      </motion.div>

      {/* -------------------------------------------- pipeline strip */}
      <div className="relative border-t border-sidebar-border/60">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-6 py-4">
          <span className="label-manifest text-sidebar-foreground/40">
            Pipeline
          </span>
          {PIPELINE.map((stage, index) => (
            <motion.span
              key={stage}
              initial={reduceMotion ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.1 + index * 0.07 }}
              className="flex items-center gap-3"
            >
              {index > 0 && (
                <span aria-hidden className="text-sidebar-foreground/20">
                  →
                </span>
              )}
              <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-sidebar-foreground/65 uppercase">
                {STATUS_LABELS[stage]}
              </span>
            </motion.span>
          ))}
        </div>
      </div>
    </header>
  );
}
