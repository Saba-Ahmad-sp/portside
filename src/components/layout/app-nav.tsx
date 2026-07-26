"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { can, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/**
 * Primary navigation.
 *
 * Each item declares the permission it needs, and visibility is decided by the
 * same `can()` the server enforces with. A member never sees a Team link —
 * and if they type the URL anyway, the page and the API both refuse
 * independently. Hiding the link is courtesy; the server is the boundary.
 */
const NAV = [
  { href: "/dashboard", label: "Overview", action: null },
  { href: "/leads", label: "Leads", action: null },
  { href: "/team", label: "Team", action: "team:view" },
] as const;

export function AppNav({ role }: { role: Role }) {
  const pathname = usePathname();

  // The nav only needs role-level answers, so a minimal user object is enough.
  const viewer = { id: "", role, isActive: true };

  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {NAV.filter((item) => item.action === null || can(viewer, item.action)).map(
        (item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative rounded-md px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors",
                active
                  ? "text-brass"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              {item.label}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-3 -bottom-[13px] h-px bg-brass"
                />
              )}
            </Link>
          );
        },
      )}
    </nav>
  );
}
