import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, ArrowRight, Plus, TrendingUp, Target } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";

export default function Dashboard() {
  const { user } = useAuthContext();
  const userName = user?.user_metadata?.full_name || "there";

  return (
    <div className="space-y-8">
      <AnnouncementBanner />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hello, {userName}!</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to RankChecker - track your keyword rankings on Google.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow border-primary/20">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Projects</CardTitle>
            <CardDescription>
              Manage your keyword tracking projects and monitor rankings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full group">
              <Link to="/dashboard/projects">
                View Projects
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-emerald-500" />
            </div>
            <CardTitle>Create Project</CardTitle>
            <CardDescription>
              Start tracking keywords for a new domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full group">
              <Link to="/dashboard/projects">
                New Project
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <CardTitle>Track Rankings</CardTitle>
            <CardDescription>
              Monitor position changes and competitor analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full group">
              <Link to="/dashboard/projects">
                Get Started
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
              <h4 className="font-medium">Create a Project</h4>
              <p className="text-sm text-muted-foreground">
                Start by creating a project for your domain to track keyword rankings
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              2
            </div>
            <div>
              <h4 className="font-medium">Add Keyword Classes</h4>
              <p className="text-sm text-muted-foreground">
                Create classes with specific country, language, and device settings
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              3
            </div>
            <div>
              <h4 className="font-medium">Add Keywords to Track</h4>
              <p className="text-sm text-muted-foreground">
                Add the keywords you want to monitor for each class
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              4
            </div>
            <div>
              <h4 className="font-medium">Monitor Rankings</h4>
              <p className="text-sm text-muted-foreground">
                Track your positions, view trends, and analyze competitor rankings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
