import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, History, BarChart3, ArrowRight } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuthContext();
  const userName = user?.user_metadata?.full_name || "there";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hello, {userName}!</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to RankChecker - your keyword ranking checker tool for Google.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow border-primary/20">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Check Ranking</CardTitle>
            <CardDescription>
              Enter keyword and URL to check position on Google SERP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full group">
              <Link to="/dashboard/rank-checker">
                Start Checking
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <History className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Check History</CardTitle>
            <CardDescription>
              Review previous ranking check results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full group">
              <Link to="/dashboard/history">
                View History
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>
              Analyze keyword ranking trends over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full group">
              <Link to="/dashboard/analytics">
                View Analytics
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              1
            </div>
            <div>
              <h4 className="font-medium">Enter the keyword to check</h4>
              <p className="text-sm text-muted-foreground">
                Enter the keyword you want to check ranking for on Google
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              2
            </div>
            <div>
              <h4 className="font-medium">Select location and language</h4>
              <p className="text-sm text-muted-foreground">
                Choose country, city and language for the most accurate results
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              3
            </div>
            <div>
              <h4 className="font-medium">Enter target URL (optional)</h4>
              <p className="text-sm text-muted-foreground">
                Enter domain or specific URL to find position in search results
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              4
            </div>
            <div>
              <h4 className="font-medium">View results</h4>
              <p className="text-sm text-muted-foreground">
                Get detailed results about ranking and top-ranking websites
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
