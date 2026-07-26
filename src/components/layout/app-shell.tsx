import Link from "next/link";
import { Anchor, Sparkles } from "lucide-react";

import { AppNav } from "@/components/layout/app-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { UserMenu } from "@/components/layout/user-menu";
import type { SessionUser } from "@/lib/server/dal";

/** The authenticated application frame: permanent desktop rail, compact drawer below laptop width. */
export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh text-foreground">
      <aside className="glass-panel fixed inset-y-0 left-0 z-40 hidden w-72 flex-col rounded-none border-y-0 border-l-0 lg:flex">
        <div className="border-b border-sidebar-border/70 px-6 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brass text-brass-foreground shadow-lg shadow-brass/15">
              <Anchor className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-xl tracking-tight text-sidebar-foreground">Portside</span>
              <span className="mt-0.5 block font-mono text-[0.6rem] uppercase tracking-[0.18em] text-sidebar-foreground/45">Lead desk</span>
            </span>
          </Link>
        </div>

        <div className="flex-1 px-4 py-6">
          <AppNav role={user.role} sidebar />
        </div>

        <div className="mx-4 mb-5 rounded-2xl border border-sidebar-border/70 bg-white/[0.025] p-4 shadow-inner shadow-black/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
            <Sparkles className="size-4 text-brass" aria-hidden />
            Keep momentum
          </div>
          <p className="mt-2 text-xs leading-5 text-sidebar-foreground/55">
            Keep your team aligned from first enquiry to a signed deal.
          </p>
        </div>

        <div className="border-t border-sidebar-border/70 px-4 py-4">
          <UserMenu user={user} />
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-sidebar-border/65 bg-sidebar/55 text-sidebar-foreground backdrop-blur-2xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 lg:hidden">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brass text-brass-foreground">
                <Anchor className="size-4" aria-hidden />
              </span>
              <span className="font-display text-lg tracking-tight">Portside</span>
            </Link>

            <div className="min-w-0 flex-1">
              <p className="hidden font-mono text-[0.625rem] uppercase tracking-[0.18em] text-sidebar-foreground/45 sm:block">
                Sales workspace
              </p>
            </div>

            {/* The drawer carries the sign-out on phones, where the menu is hidden. */}
            <div className="lg:hidden">
              <AppNav role={user.role} user={user} />
            </div>
            <div className="hidden sm:block lg:hidden">
              <UserMenu user={user} />
            </div>
          </div>
        </header>

        <main className="app-canvas paper-grain relative flex-1">
          <div className="relative mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
