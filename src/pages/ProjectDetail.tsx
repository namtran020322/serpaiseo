import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Settings, Globe, Monitor, Smartphone, Tablet, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/hooks/useProjects";
import { RankingStatsCards } from "@/components/projects/RankingStatsCards";
import { RankingDistributionChart } from "@/components/projects/RankingDistributionChart";
import { TopOverviewTable } from "@/components/projects/TopOverviewTable";
import { formatDistanceToNow } from "date-fns";

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-destructive">Project not found</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  // Aggregate stats from all classes
  const totalKeywords = project.classes.reduce((acc, cls) => acc + cls.keywordCount, 0);
  const aggregatedStats = project.classes.reduce(
    (acc, cls) => ({
      top3: acc.top3 + cls.rankingStats.top3,
      top10: acc.top10 + cls.rankingStats.top10,
      top30: acc.top30 + cls.rankingStats.top30,
      top100: acc.top100 + cls.rankingStats.top100,
      notFound: acc.notFound + cls.rankingStats.notFound,
      total: acc.total + cls.rankingStats.total,
    }),
    { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/projects">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground mt-1">
              {project.classes.length} class{project.classes.length !== 1 ? "es" : ""} · {totalKeywords} keywords
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh All
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <RankingStatsCards stats={aggregatedStats} />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RankingDistributionChart stats={aggregatedStats} />
        <TopOverviewTable classes={project.classes} />
      </div>

      {/* Classes List */}
      <Card>
        <CardHeader>
          <CardTitle>Classes</CardTitle>
          <CardDescription>Click on a class to view detailed keyword rankings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {project.classes.map((cls) => {
              const DeviceIcon = deviceIcons[cls.device as keyof typeof deviceIcons] || Monitor;
              return (
                <Link
                  key={cls.id}
                  to={`/dashboard/projects/${projectId}/classes/${cls.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {cls.domain}
                        </span>
                        <span>{cls.country_name}</span>
                        <span className="flex items-center gap-1">
                          <DeviceIcon className="h-3 w-3" />
                          {cls.device}
                        </span>
                        {cls.schedule && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {cls.schedule}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{cls.keywordCount} KWs</Badge>
                      <span className="text-emerald-600 font-medium">{cls.rankingStats.top3}</span>
                      <span className="text-blue-600 font-medium">{cls.rankingStats.top10}</span>
                      <span className="text-amber-600 font-medium">{cls.rankingStats.top30}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(cls.last_checked_at || cls.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
