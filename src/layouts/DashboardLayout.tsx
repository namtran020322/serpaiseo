import { useMemo } from "react";
import { Outlet, useLocation, Link, useParams } from "react-router-dom";
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
import { useProject, useProjectClass } from "@/hooks/useProjects";
import { Fragment } from "react";

const routeLabels: Record<string, string> = {
  "dashboard": "Home",
  "projects": "Projects",
  "settings": "Settings",
  "billing": "Billing",
  "notifications": "Notifications",
};

interface BreadcrumbItemData {
  label: string;
  href: string | null;
}

export default function DashboardLayout() {
  const location = useLocation();
  const params = useParams<{ projectId?: string; classId?: string }>();
  
  // Fetch project and class data using cached queries
  const { data: project } = useProject(params.projectId);
  const { data: projectClass } = useProjectClass(params.classId);

  const breadcrumbItems = useMemo<BreadcrumbItemData[]>(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const items: BreadcrumbItemData[] = [];

    // Always start with Home
    if (pathSegments.length === 1 && pathSegments[0] === "dashboard") {
      // Only Home - it's the current page
      items.push({ label: "Home", href: null });
      return items;
    }

    items.push({ label: "Home", href: "/dashboard" });

    // Handle different routes
    if (pathSegments[1] === "projects") {
      // Projects section
      if (!params.projectId) {
        // Projects list page
        items.push({ label: "Projects", href: null });
      } else {
        // Project detail or class detail
        items.push({ label: "Projects", href: "/dashboard/projects" });
        
        if (project) {
          if (!params.classId) {
            // Project detail page
            items.push({ label: project.name, href: null });
          } else {
            // Class detail page
            items.push({ 
              label: project.name, 
              href: `/dashboard/projects/${params.projectId}` 
            });
            
            if (projectClass) {
              items.push({ label: projectClass.name, href: null });
            }
          }
        }
      }
    } else if (pathSegments[1]) {
      // Other pages (billing, notifications, settings)
      const label = routeLabels[pathSegments[1]] || pathSegments[1];
      items.push({ label, href: null });
    }

    return items;
  }, [location.pathname, params.projectId, params.classId, project, projectClass]);

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Fixed Header */}
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 flex items-center gap-2 flex-shrink-0 z-20">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4 mx-2" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbItems.map((item, index) => (
                  <Fragment key={index}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {item.href ? (
                        <BreadcrumbLink asChild>
                          <Link to={item.href}>{item.label}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex-1" />
          </header>
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
