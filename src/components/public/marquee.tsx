import { cn } from "@/lib/utils";

/**
 * Infinite scrolling strip.
 *
 * A Server Component — the motion is a CSS keyframe, so this ships zero
 * JavaScript. Running on the compositor also means it keeps moving smoothly
 * while React is busy elsewhere, which a `requestAnimationFrame` loop would
 * not.
 *
 * The track is rendered twice and translated exactly -50%, which is what makes
 * the loop seamless. The duplicate is hidden from assistive technology so the
 * content is not announced twice.
 */

/**
 * Declared at module scope, not inside Marquee. A component defined during
 * render is a new type on every render, so React unmounts and remounts the
 * subtree instead of updating it — which would restart the animation.
 */
function Track({ items, hidden }: { items: string[]; hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden} className="flex shrink-0 items-center gap-10 pr-10">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="flex shrink-0 items-center gap-10 font-mono text-[0.6875rem] tracking-[0.16em] whitespace-nowrap uppercase"
        >
          {item}
          <span aria-hidden className="text-brass/50">
            ·
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Marquee({
  items,
  durationSeconds = 42,
  reverse = false,
  className,
}: {
  items: string[];
  durationSeconds?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("marquee-mask overflow-hidden", className)}>
      <div
        className="marquee-track flex w-max motion-reduce:animate-none"
        style={
          {
            "--marquee-duration": `${durationSeconds}s`,
            animationDirection: reverse ? "reverse" : "normal",
          } as React.CSSProperties
        }
      >
        <Track items={items} />
        <Track items={items} hidden />
      </div>
    </div>
  );
}
