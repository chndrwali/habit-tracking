import AppSidebar from "@/modules/admin/ui/layout/app-sidebar";
import Header from "@/modules/admin/ui/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Persisting the sidebar state in the cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      {/* fixed overflow container (horizontal scroll) - more info https://github.com/shadcn-ui/ui/issues/5545#issuecomment-2867696778 */}
      <SidebarInset className="min-w-0">
        <Header />
        {/* page main content */}
        {children}
        {/* page main content ends */}
      </SidebarInset>
    </SidebarProvider>
  );
}
