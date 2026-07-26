import Link from "next/link";
import { Anchor } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { AppNav } from "@/components/layout/app-nav";
import { UserMenu } from "@/components/layout/user-menu";
import type { SessionUser } from "@/lib/server/dal";

/**
 * The frame every authenticated page renders inside.
 *
 * A Server Component: the nav links and the user's identity are rendered on the
 * server, and only the two genuinely interactive pieces — the active-link
 * highlight and the sign-out menu — ship as client components.
 *
 * The nav is built from the same `can()` the API enforces with, so a link a
 * user cannot follow is never drawn.
 */
export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex w-full max-w-[100rem] items-center gap-8 px-6 py-3">
          <Link href="/leads" className="flex shrink-0 items-center gap-2.5">
            <Anchor className="size-[1.15rem] text-brass" aria-hidden />
            <span className="font-display text-base tracking-tight">
              Portside
            </span>
          </Link>

          <AppNav role={user.role} />

          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      <main className="paper-grain relative flex-1 bg-background">
        <div className="relative mx-auto w-full max-w-[100rem] px-6 py-8">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
