import { getSession } from "@/hooks/get-session";
import { redirect } from "next/navigation";
import { AppNav } from "@/app/(app)/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen">
      <AppNav userName={session.user.name ?? session.user.email ?? null} />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
