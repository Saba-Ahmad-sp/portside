import { AppShell } from "@/components/layout/app-shell";
import { requireSessionOrRedirect } from "@/lib/server/dal";

/**
 * Every authenticated route renders inside this.
 *
 * The session is resolved here so the shell can render the user's name and the
 * permission-filtered nav — but note this layout is NOT the security boundary.
 * Layouts do not re-render on navigation under partial rendering, so each page
 * and every route handler resolves the session again through the DAL, next to
 * the data it protects.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSessionOrRedirect();

  return <AppShell user={session.user}>{children}</AppShell>;
}
