import Link from "next/link";

/**
 * Shared footer. Rendered on every surface — public and authenticated — because
 * the brief requires the attribution line to be visible on the live build, and
 * a footer that only exists on the marketing page is easy to miss.
 *
 * `tone` lets it sit on paper or on navy chrome without a second component.
 *
 * `showSignIn` is passed rather than derived from the session on purpose. The
 * footer could read the session itself, but it renders on the landing page,
 * which is statically prerendered — touching cookies there would make the whole
 * page dynamic to hide one link. The two callers that already know the answer
 * say so instead.
 */
export function SiteFooter({
  tone = "paper",
  showSignIn = true,
}: {
  tone?: "paper" | "navy";
  /** Off when already signed in, and on the sign-in page itself. */
  showSignIn?: boolean;
}) {
  const isNavy = tone === "navy";

  return (
    <footer
      className={
        isNavy
          ? "border-t border-sidebar-border bg-sidebar text-sidebar-foreground"
          : "border-t border-border bg-background text-muted-foreground"
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono uppercase tracking-[0.14em]">
          Portside — lead desk for import sourcing teams
        </p>

        <p>
          <a
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noreferrer"
            className={
              isNavy
                ? "underline decoration-brass/60 underline-offset-4 transition-colors hover:text-brass"
                : "underline decoration-brass/70 underline-offset-4 transition-colors hover:text-foreground"
            }
          >
            Built for Digital Heroes Training Task
          </a>
        </p>

        {showSignIn && (
          <p className="font-mono">
            <Link
              href="/login"
              className="underline-offset-4 transition-opacity hover:underline hover:opacity-80"
            >
              Team sign in
            </Link>
          </p>
        )}
      </div>
    </footer>
  );
}
