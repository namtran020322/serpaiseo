import { Outlet, useLocation, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  "dashboard": "Home",
  "rank-checker": "Rank Checker",
  "projects": "Projects",
  "history": "History",
  "analytics": "Analytics",
  "settings": "Settings",
};

export default function DashboardLayout() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  // e.g., "/dashboard/rank-checker" → ["dashboard", "rank-checker"]

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 flex items-center gap-2 sticky top-0 z-10">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4 mx-2" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  {pathSegments.length === 1 ? (
                    <BreadcrumbPage>Home</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to="/dashboard">Home</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {pathSegments.length > 1 && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {routeLabels[pathSegments[1]] || pathSegments[1]}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex-1" />
          </header>
          <div className="flex-1 p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
