import { Suspense } from "react";
import Link from "next/link";
import { Anchor } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { SiteFooter } from "@/components/layout/site-footer";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Sign in" };

/**
 * Split sign-in: navy on the left carrying the demo credentials a reviewer
 * needs, paper on the right carrying the form.
 *
 * The credentials panel is deliberately part of the UI rather than buried in
 * the README — this is a submitted demo, and a reviewer should not have to go
 * hunting for a way in.
 */

const DEMO_ACCOUNTS = [
  {
    key: "admin",
    role: "Admin",
    email: "admin@portside.demo",
    note: "Sees every lead, assigns work, opens Team.",
  },
  {
    key: "priya",
    role: "Member",
    email: "priya@portside.demo",
    note: "Sees only leads assigned to her.",
  },
  {
    key: "rahul",
    role: "Member",
    email: "rahul@portside.demo",
    note: "Try opening one of Priya's leads — you will get a 404.",
  },
] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const { demo } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="grid flex-1 lg:grid-cols-2">
        {/* -------------------------------------------------- credentials */}
        <aside className="relative isolate hidden overflow-hidden bg-sidebar px-10 py-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden className="chart-grid absolute inset-0 opacity-50" />
          <div
            aria-hidden
            className="absolute -bottom-32 -left-20 size-[32rem] rounded-full bg-brass/10 blur-[110px]"
          />

          <Link href="/" className="relative flex items-center gap-2.5 w-fit">
            <Anchor className="size-5 text-brass" aria-hidden />
            <span className="font-display text-lg">Portside</span>
          </Link>

          <div className="relative">
            <p className="label-manifest text-brass">Demo accounts</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-sidebar-foreground/70">
              Three sign-ins so the permission model can be checked by hand
              rather than taken on trust. Pick one to fill the form.
            </p>

            {/*
              Links rather than buttons: selecting an account puts ?demo= in the
              URL and the form reads it. That keeps the panel a Server Component,
              needs no state lifted across the split layout, and sidesteps the
              real problem this solves — a password manager silently autofilling
              a saved credential over the demo one.
            */}
            <ul className="mt-8">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email} className="border-t border-sidebar-border/60">
                  <Link
                    href={`/login?demo=${account.key}`}
                    className="group block py-4 transition-colors hover:bg-sidebar-accent/40 focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-none"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="label-manifest w-14 shrink-0 text-brass/80">
                        {account.role}
                      </span>
                      <span className="font-mono text-sm group-hover:text-brass">
                        {account.email}
                      </span>
                    </span>
                    <span className="mt-1 block pl-[4.25rem] text-xs text-sidebar-foreground/55">
                      {account.note}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-6 border-t border-sidebar-border/60 pt-4 text-xs text-sidebar-foreground/55">
              Password for all three:{" "}
              <span className="font-mono text-sidebar-foreground/90">
                PortsideDemo!2026
              </span>
            </p>
          </div>

          <p className="relative text-xs text-sidebar-foreground/45">
            Seeded demo data. Nothing here is a real company or contact.
          </p>
        </aside>

        {/* --------------------------------------------------------- form */}
        <main className="paper-grain relative flex items-center justify-center bg-background px-6 py-16">
          <div className="relative w-full max-w-sm">
            <Link
              href="/"
              className="flex items-center gap-2.5 lg:hidden"
              aria-label="Portside home"
            >
              <Anchor className="size-5 text-brass" aria-hidden />
              <span className="font-display text-lg">Portside</span>
            </Link>

            <h1 className="mt-8 font-display text-3xl lg:mt-0">
              Sign in to the desk
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              For the trade team. Customers use{" "}
              <Link
                href="/#enquiry"
                className="underline decoration-brass/60 underline-offset-4 hover:text-foreground"
              >
                the enquiry form
              </Link>
              .
            </p>

            {/*
              The form reads ?next= to send you back where you were headed, and
              useSearchParams() opts a component out of prerendering. Suspense
              keeps the rest of this page static and only defers the form.
            */}
            <div className="mt-8">
              <Suspense fallback={<LoginFormSkeleton />}>
                {/* Keyed so picking a different demo account remounts the
                    form and its defaultValues apply again. */}
                <LoginForm key={demo ?? "blank"} />
              </Suspense>
            </div>
          </div>
        </main>
      </div>

      {/* This is the sign-in page; linking to it from its own footer is noise. */}
      <SiteFooter showSignIn={false} />
    </div>
  );
}

/** Matches the form's layout so nothing shifts when it hydrates. */
function LoginFormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
