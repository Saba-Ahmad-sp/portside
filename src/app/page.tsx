import Link from "next/link";
import { Anchor, ArrowUpRight } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { EnquiryForm } from "@/components/public/enquiry-form";
import { PIPELINE } from "@/lib/permissions";
import { STATUS_LABELS } from "@/lib/types";

/**
 * Public landing page and capture form.
 *
 * A Server Component. The only client JavaScript on this route is the form
 * itself — the hero, the pipeline strip and the footer ship as HTML, and the
 * entrance stagger is CSS with animation delays rather than a motion runtime.
 */

export const metadata = {
  title: "Portside — the lead desk for export teams",
};

const PROOF = [
  { value: "1", label: "shared desk" },
  { value: "6", label: "pipeline stages" },
  { value: "100%", label: "of changes logged" },
];

const HOW_IT_WORKS = [
  ["01", "You send an enquiry", "It lands on the desk as a new lead."],
  ["02", "A rep picks it up", "An admin assigns it to whoever knows that market."],
  ["03", "It gets worked", "Status, notes and every change recorded against the lead."],
] as const;

export default function LandingPage() {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/*  Hero — navy chrome, chart paper, brass                           */}
      {/* ---------------------------------------------------------------- */}
      <header className="relative isolate overflow-hidden bg-sidebar text-sidebar-foreground">
        <div aria-hidden className="chart-grid absolute inset-0 opacity-60" />
        <div
          aria-hidden
          className="absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-brass/10 blur-[120px]"
        />

        <nav className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
          <span className="flex items-center gap-2.5">
            <Anchor className="size-5 text-brass" aria-hidden />
            <span className="font-display text-lg tracking-tight">Portside</span>
          </span>

          <Link
            href="/login"
            className="group inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-sidebar-foreground/80 transition-colors hover:text-brass"
          >
            Team sign in
            <ArrowUpRight
              className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </nav>

        <div className="relative mx-auto w-full max-w-7xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-3xl">
            <p
              className="label-manifest fill-mode-both animate-in fade-in slide-in-from-bottom-2 text-brass/90 duration-700"
              style={{ animationDelay: "80ms" }}
            >
              Export &amp; import · trade enquiries
            </p>

            <h1
              className="fill-mode-both mt-5 animate-in fade-in slide-in-from-bottom-3 font-display text-4xl leading-[1.05] duration-700 sm:text-6xl lg:text-7xl"
              style={{ animationDelay: "160ms" }}
            >
              Every enquiry
              <br />
              <span className="text-brass">lands somewhere.</span>
            </h1>

            <p
              className="fill-mode-both mt-6 max-w-xl animate-in fade-in slide-in-from-bottom-3 text-base leading-relaxed text-sidebar-foreground/75 duration-700 sm:text-lg"
              style={{ animationDelay: "240ms" }}
            >
              Portside is the desk where trade enquiries stop getting lost in a
              WhatsApp group. Capture, assign, work the pipeline — and keep a
              complete record of who did what, and when.
            </p>

            <div
              className="fill-mode-both mt-10 flex flex-wrap items-center gap-x-10 gap-y-5 animate-in fade-in slide-in-from-bottom-3 duration-700"
              style={{ animationDelay: "320ms" }}
            >
              {PROOF.map((item) => (
                <div key={item.label}>
                  <p data-numeric className="font-display text-3xl text-brass">
                    {item.value}
                  </p>
                  <p className="label-manifest mt-0.5 text-sidebar-foreground/60">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pipeline strip — the product's core idea, stated as a route. */}
        <div className="relative border-t border-sidebar-border/60">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-6 py-4">
            <span className="label-manifest text-sidebar-foreground/45">
              Pipeline
            </span>
            {PIPELINE.map((stage, index) => (
              <span key={stage} className="flex items-center gap-3">
                {index > 0 && (
                  <span aria-hidden className="text-sidebar-foreground/25">
                    →
                  </span>
                )}
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-sidebar-foreground/70">
                  {STATUS_LABELS[stage]}
                </span>
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/*  Capture form — paper                                            */}
      {/* ---------------------------------------------------------------- */}
      <main className="paper-grain relative flex-1 bg-background">
        <section
          id="enquiry"
          aria-labelledby="enquiry-heading"
          className="relative mx-auto w-full max-w-7xl px-6 py-20 sm:py-28"
        >
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
            <div className="lg:pt-2">
              <p className="label-manifest text-brass">Start here</p>
              <h2
                id="enquiry-heading"
                className="mt-4 font-display text-3xl leading-tight sm:text-4xl"
              >
                Tell us what you need shipped.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                This form is the front door of the platform. What you send
                arrives as a lead on the trade desk, timestamped and unassigned,
                and someone picks it up from there.
              </p>

              <div className="mt-10">
                {HOW_IT_WORKS.map(([step, title, body]) => (
                  <div key={step} className="border-t border-border py-5">
                    <div className="flex gap-5">
                      <span className="label-manifest pt-0.5 text-brass">
                        {step}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {body}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <EnquiryForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
