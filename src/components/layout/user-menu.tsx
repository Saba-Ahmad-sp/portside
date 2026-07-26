"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/server/dal";

/** "Priya Nair" -> "PN" */
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-none">
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-brass/15 font-mono text-[0.625rem] tracking-wider text-brass"
        >
          {initials(user.fullName)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs leading-tight">{user.fullName}</span>
          <span className="block font-mono text-[0.625rem] uppercase tracking-[0.14em] text-sidebar-foreground/50">
            {user.role}
          </span>
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm">{user.fullName}</span>
          <span className="block font-mono text-xs text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="gap-2">
          <LogOut className="size-3.5" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
