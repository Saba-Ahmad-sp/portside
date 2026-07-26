"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

/**
 * Scroll-triggered reveal. One implementation, used by every section.
 *
 * Written once because the alternative is a slightly different `whileInView`
 * config scattered through six files, which is how a page ends up with
 * animations that almost — but do not quite — agree with each other.
 *
 * `once` is deliberate: content that re-animates every time it re-enters the
 * viewport is irritating on the second scroll past.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggers direct children. Pair with <RevealItem>.
 *
 * The children animate in sequence from one parent trigger rather than each
 * child owning its own viewport observer — fewer observers, and the rhythm is
 * defined in one place.
 */
export function RevealGroup({
  children,
  stagger = 0.08,
  className,
}: {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: reduceMotion ? 0 : stagger },
    },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  y = 20,
  className,
}: {
  children: React.ReactNode;
  y?: number;
  className?: string;
}) {
  const item: Variants = {
    hidden: { opacity: 0, y },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };

  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}

/**
 * Headline that assembles word by word.
 *
 * Splitting on words rather than characters: per-character animation on a
 * heading reads as a novelty effect, and it shreds the accessibility tree.
 * The whole string is exposed to screen readers as one label, and the visible
 * spans are hidden from them.
 */
export function RevealWords({
  text,
  className,
  wordClassName,
  delay = 0,
}: {
  text: string;
  className?: string;
  /** Applied per word — used to colour part of a headline. */
  wordClassName?: (word: string, index: number) => string | undefined;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const words = text.split(" ");

  return (
    <span className={className} aria-label={text}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          aria-hidden
          className="inline-block overflow-hidden align-bottom"
        >
          <motion.span
            className={`inline-block ${wordClassName?.(word, index) ?? ""}`}
            initial={reduceMotion ? false : { y: "108%" }}
            animate={{ y: 0 }}
            transition={{
              duration: 0.85,
              delay: delay + index * 0.06,
              ease: EASE,
            }}
          >
            {word}
          </motion.span>
          {index < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}
