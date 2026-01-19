import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Separator } from "@/components/ui/separator";

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <AdminSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-20 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center h-full px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mx-4 h-6" />
              <div className="font-medium">Admin Panel</div>
            </div>
          </header>
          {/* Content */}
          <div className="p-6 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
