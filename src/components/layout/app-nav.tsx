"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { can, type Role } from "@/lib/permissions";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV: readonly {
  href: string;
  label: string;
  action: "team:view" | null;
  icon: LucideIcon;
}[] = [
  { href: "/dashboard", label: "Dashboard", action: null, icon: LayoutDashboard },
  { href: "/leads", label: "Leads", action: null, icon: ClipboardList },
  { href: "/team", label: "Team", action: "team:view", icon: UsersRound },
];

/**
 * Navigation has two deliberate presentations:
 * - desktop (`lg` and above): the permanent sidebar;
 * - tablet and phone: an accessible slide-over drawer.
 *
 * The list itself is permission-aware, using the same pure `can()` rule the
 * server relies on. Visibility is a convenience; server authorization remains
 * the actual boundary.
 */
export function AppNav({
  role,
  sidebar = false,
  user,
}: {
  role: Role;
  sidebar?: boolean;
  /** Supplied for the drawer, which carries the only sign-out on a phone. */
  user?: { fullName: string; email: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const viewer = { id: "", role, isActive: true };

  async function signOut() {
    setSigningOut(true);
    // `local`, matching the desktop menu: this device only.
    await getBrowserSupabase().auth.signOut({ scope: "local" });
    setOpen(false);
    router.push("/login");
    router.refresh();
  }
  const items = NAV.filter((item) => item.action === null || can(viewer, item.action));

  const links = (variant: "sidebar" | "drawer") =>
    items.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);

      return (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          onClick={() => setOpen(false)}
          className={cn(
            "group flex items-center gap-3 rounded-xl border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-none",
            variant === "sidebar"
              ? "px-3 py-3 text-sm font-semibold"
              : "px-4 py-3.5 text-base font-semibold",
            active
              ? "border-sidebar-border bg-sidebar-accent text-brass shadow-[inset_0_1px_0_rgb(255_255_255_/_0.05)]"
              : "border-transparent text-sidebar-foreground/75 hover:border-sidebar-border/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          )}
        >
          <Icon
            className={cn(
              "shrink-0 transition-colors",
              variant === "sidebar" ? "size-[1.05rem]" : "size-5",
              active ? "text-brass" : "text-sidebar-foreground/65 group-hover:text-sidebar-foreground",
            )}
            aria-hidden
          />
          <span>{label}</span>
        </Link>
      );
    });

  if (sidebar) {
    return (
      <nav aria-label="Main" className="space-y-1.5">
        {links("sidebar")}
      </nav>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-10 items-center justify-center rounded-xl border border-sidebar-border/70 bg-sidebar/55 text-sidebar-foreground backdrop-blur-xl transition-colors hover:bg-sidebar-accent lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {/*
        Portalled to <body>, and this is load-bearing rather than tidiness.

        The drawer is rendered from inside <header className="sticky z-30">,
        which creates its own stacking context. Any z-index used inside it is
        resolved WITHIN that context, so `z-50` here could never rise above the
        header's own z-30 globally — the main content, later in the DOM, simply
        painted over it. The symptom looked like transparency; the panel's
        background was fully opaque the whole time, it was just being covered.

        No mounted guard is needed: `open` starts false, so this never runs
        during SSR and document.body is always present by the time it does.
      */}
      {open && createPortal(
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            style={{ backgroundColor: "rgba(4, 8, 14, 0.78)" }}
            className="absolute inset-0"
          />
          <nav
            aria-label="Mobile main"
            /*
              Opaque background set inline, deliberately.
              Every surface token in this theme carries an alpha for the
              desktop glass effect, and a Tailwind arbitrary value did not hold
              either — the page kept reading through the panel. An inline
              background-color cannot be purged, cannot lose a cascade-layer
              fight, and cannot inherit someone else's transparency.
            */
            style={{ backgroundColor: "#0e1622" }}
            className="absolute inset-y-0 left-0 flex w-[min(19.5rem,88vw)] flex-col rounded-r-2xl border-y-0 border-l-0 border-sidebar-border/70 p-5 text-sidebar-foreground shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-sidebar-border/70 pb-5">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-brass text-brass-foreground shadow-lg shadow-brass/15">
                  <span className="font-display text-lg">P</span>
                </span>
                <span className="font-display text-xl tracking-tight">Portside</span>
              </Link>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setOpen(false)}
                className="inline-flex size-10 items-center justify-center rounded-xl text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="mt-7 space-y-2">{links("drawer")}</div>

            {/*
              On a phone the header's user menu is hidden, so without this
              there is no way to sign out at all — which makes it impossible to
              switch accounts and check the permission model on a small screen.
            */}
            {user && (
              <div className="mt-auto border-t border-sidebar-border/70 pt-5">
                <p className="text-sm font-semibold">{user.fullName}</p>
                <p className="mt-0.5 font-mono text-xs break-all text-sidebar-foreground/55">
                  {user.email}
                </p>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sidebar-border/70 px-4 py-3 text-sm font-semibold text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:opacity-60"
                >
                  {signingOut ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <LogOut className="size-4" aria-hidden />
                  )}
                  Sign out
                </button>
              </div>
            )}
          </nav>
        </div>,
        document.body,
      )}
    </>
  );
}
