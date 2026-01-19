import { Navigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { isAdmin, isLoading, user } = useAdminRole();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-sm">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // If not logged in, redirect to admin login
  if (!user) {
    return <Navigate to="/admin/account" replace />;
  }

  // If logged in but not admin, redirect to 404
  if (!isAdmin) {
    return <Navigate to="/not-found" replace />;
  }

  return <>{children}</>;
}
