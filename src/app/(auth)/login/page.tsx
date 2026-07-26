import Link from "next/link";
import { Anchor } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { SiteFooter } from "@/components/layout/site-footer";

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
    role: "Admin",
    email: "admin@portside.demo",
    note: "Sees all 36 leads, assigns work, opens Team.",
  },
  {
    role: "Member",
    email: "priya@portside.demo",
    note: "Sees only leads assigned to her.",
  },
  {
    role: "Member",
    email: "rahul@portside.demo",
    note: "Try opening one of Priya's leads — you will get a 404.",
  },
];

export default function LoginPage() {
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
              rather than taken on trust.
            </p>

            <dl className="mt-8 space-y-0">
              {DEMO_ACCOUNTS.map((account) => (
                <div
                  key={account.email}
                  className="border-t border-sidebar-border/60 py-4"
                >
                  <dt className="flex items-baseline gap-3">
                    <span className="label-manifest w-14 shrink-0 text-brass/80">
                      {account.role}
                    </span>
                    <span className="font-mono text-sm">{account.email}</span>
                  </dt>
                  <dd className="mt-1 pl-[4.25rem] text-xs text-sidebar-foreground/55">
                    {account.note}
                  </dd>
                </div>
              ))}
            </dl>

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

            <div className="mt-8">
              <LoginForm />
            </div>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
