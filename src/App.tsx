import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TaskProgressProvider } from "@/contexts/TaskProgressContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { Loader2 } from "lucide-react";

// Import layouts directly (not lazy) to prevent sidebar reload on navigation
import DashboardLayout from "./layouts/DashboardLayout";
import AdminLayout from "./layouts/AdminLayout";

// Lazy loaded pages only
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Billing = lazy(() => import("./pages/Billing"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const ClassDetail = lazy(() => import("./pages/ClassDetail"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TaskProgressProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* User Dashboard Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                  <Route path="projects" element={<Suspense fallback={<PageLoader />}><Projects /></Suspense>} />
                  <Route path="projects/:projectId" element={<Suspense fallback={<PageLoader />}><ProjectDetail /></Suspense>} />
                  <Route path="projects/:projectId/classes/:classId" element={<Suspense fallback={<PageLoader />}><ClassDetail /></Suspense>} />
                  <Route path="billing" element={<Suspense fallback={<PageLoader />}><Billing /></Suspense>} />
                  <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
                  <Route path="notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<Navigate to="/admin/account" replace />} />
                <Route path="/admin/account" element={<Suspense fallback={<PageLoader />}><AdminLogin /></Suspense>} />
                <Route
                  path="/admin"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout />
                    </AdminProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
                  <Route path="users" element={<Suspense fallback={<PageLoader />}><AdminUsers /></Suspense>} />
                  <Route path="finance" element={<Suspense fallback={<PageLoader />}><AdminFinance /></Suspense>} />
                  <Route path="announcements" element={<Suspense fallback={<PageLoader />}><AdminAnnouncements /></Suspense>} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </TaskProgressProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
