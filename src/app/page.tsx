import { ClipboardList, History, ShieldCheck } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { EnquiryForm } from "@/components/public/enquiry-form";
import { Hero } from "@/components/public/hero";
import { Marquee } from "@/components/public/marquee";
import { Reveal, RevealGroup, RevealItem } from "@/components/shared/reveal";

export const metadata = {
  title: "Portside — the lead desk for export teams",
};

const ROUTES = [
  "Basmati rice · United Arab Emirates",
  "Cotton yarn · Singapore",
  "Turmeric · Poland",
  "Darjeeling tea · Australia",
  "Granite · Japan",
  "Cardamom · United States",
  "Jute packaging · Austria",
  "Leather goods · Chile",
  "Soybean meal · Vietnam",
];

const CAPABILITIES = [
  {
    icon: ClipboardList,
    title: "One desk, not six inboxes",
    body: "Every enquiry lands in the same place, whether it came from the website or a colleague forwarding an email. Nothing sits in someone's WhatsApp waiting to be noticed.",
  },
  {
    icon: ShieldCheck,
    title: "People see their own book",
    body: "A salesperson sees the leads assigned to them and nothing else — enforced at the API and again at the database, not just hidden in the interface.",
  },
  {
    icon: History,
    title: "The record writes itself",
    body: "Every assignment, status change and note is logged automatically, with who and when. Nobody remembers to fill in an audit trail, so the system does it for them.",
  },
];

const HOW_IT_WORKS = [
  ["01", "You send an enquiry", "It lands on the desk as a new lead, timestamped and unassigned."],
  ["02", "A rep picks it up", "An admin assigns it to whoever knows that market."],
  ["03", "It gets worked", "Status, notes and every change recorded against the lead."],
] as const;

export default function LandingPage() {
  return (
    <>
      <Hero />

      <main className="paper-grain relative flex-1 bg-background">
        {/* ------------------------------------------------------ marquee */}
        <div className="border-b border-border bg-card/60 py-4 text-muted-foreground">
          <Marquee items={ROUTES} durationSeconds={46} />
        </div>

        {/* ------------------------------------------------- capabilities */}
        <section
          aria-labelledby="capabilities-heading"
          className="mx-auto w-full max-w-7xl px-6 py-20 sm:py-28"
        >
          <Reveal>
            <p className="label-manifest text-brass">What it is</p>
            <h2
              id="capabilities-heading"
              className="mt-4 max-w-2xl font-display text-3xl leading-tight sm:text-4xl"
            >
              A lead platform, not a lead form.
            </h2>
          </Reveal>

          <RevealGroup className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            {CAPABILITIES.map((capability) => (
              <RevealItem
                key={capability.title}
                className="group bg-card p-7 transition-colors hover:bg-accent/40"
              >
                <span className="flex size-9 items-center justify-center rounded-md bg-brass/10 text-brass transition-transform group-hover:scale-105">
                  <capability.icon className="size-4" aria-hidden />
                </span>
                <h3 className="mt-5 font-display text-lg">{capability.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {capability.body}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* ---------------------------------------------------- enquiry */}
        <section
          id="enquiry"
          aria-labelledby="enquiry-heading"
          className="relative border-t border-border"
        >
          <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:py-28">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
              <div className="lg:pt-2">
                <Reveal>
                  <p className="label-manifest text-brass">Start here</p>
                  <h2
                    id="enquiry-heading"
                    className="mt-4 font-display text-3xl leading-tight sm:text-4xl"
                  >
                    Tell us what you need shipped.
                  </h2>
                  <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                    This form is the front door of the platform. What you send
                    arrives as a lead on the trade desk, timestamped and
                    unassigned, and someone picks it up from there.
                  </p>
                </Reveal>

                <RevealGroup className="mt-10" stagger={0.1}>
                  {HOW_IT_WORKS.map(([step, title, body]) => (
                    <RevealItem
                      key={step}
                      className="border-t border-border py-5"
                    >
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
                    </RevealItem>
                  ))}
                </RevealGroup>
              </div>

              <Reveal delay={0.1}>
                <EnquiryForm />
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
