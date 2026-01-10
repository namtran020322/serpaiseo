import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if email is confirmed
  if (!user.email_confirmed_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
        <Card className="w-full max-w-md shadow-xl border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Email Not Verified</CardTitle>
            <CardDescription className="text-base">
              Please verify your email address to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
              <p>Check your inbox for a verification email from us. Click the link in the email to confirm your account.</p>
              <p className="mt-2">Don't see it? Check your spam folder.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => signOut()}
            >
              Sign Out & Try Again
            </Button>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
              Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
