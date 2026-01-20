import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Settings, Globe, Monitor, Smartphone, Tablet, Calendar, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/hooks/useProjects";
import { RankingStatsCards } from "@/components/projects/RankingStatsCards";
import { RankingDistributionChart } from "@/components/projects/RankingDistributionChart";
import { TopOverviewTable } from "@/components/projects/TopOverviewTable";
import { ProjectSettingsDialog } from "@/components/projects/ProjectSettingsDialog";
import { AddClassDialog } from "@/components/projects/AddClassDialog";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
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
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  // Aggregate stats from all classes (with improved/declined)
  const totalKeywords = project.classes.reduce((acc, cls) => acc + cls.keywordCount, 0);
  const aggregatedStats = project.classes.reduce(
    (acc, cls) => {
      const s = cls.rankingStats;
      return {
        top3: acc.top3 + s.top3,
        top10: acc.top10 + s.top10,
        top30: acc.top30 + s.top30,
        top100: acc.top100 + s.top100,
        notFound: acc.notFound + s.notFound,
        total: acc.total + s.total,
        top3_improved: acc.top3_improved + (s.top3_improved || 0),
        top3_declined: acc.top3_declined + (s.top3_declined || 0),
        top10_improved: acc.top10_improved + (s.top10_improved || 0),
        top10_declined: acc.top10_declined + (s.top10_declined || 0),
        top30_improved: acc.top30_improved + (s.top30_improved || 0),
        top30_declined: acc.top30_declined + (s.top30_declined || 0),
        top100_improved: acc.top100_improved + (s.top100_improved || 0),
        top100_declined: acc.top100_declined + (s.top100_declined || 0),
        notFound_improved: acc.notFound_improved + (s.notFound_improved || 0),
        notFound_declined: acc.notFound_declined + (s.notFound_declined || 0),
      };
    },
    { 
      top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0,
      top3_improved: 0, top3_declined: 0,
      top10_improved: 0, top10_declined: 0,
      top30_improved: 0, top30_declined: 0,
      top100_improved: 0, top100_declined: 0,
      notFound_improved: 0, notFound_declined: 0,
    }
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
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <DomainWithFavicon domain={project.domain} showFullDomain />
              <span>
                {project.classes.length} class{project.classes.length !== 1 ? "es" : ""} · {totalKeywords} keywords
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh All
          </Button>
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
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

      {/* Classes Section - No Card wrapper */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Classes</h2>
            <p className="text-sm text-muted-foreground">Click on a class to view detailed keyword rankings</p>
          </div>
          <AddClassDialog projectId={projectId!} projectDomain={project.domain} />
        </div>
        <div className="rounded-md border">
          {project.classes.map((cls, index) => {
            const DeviceIcon = deviceIcons[cls.device as keyof typeof deviceIcons] || Monitor;
            return (
              <Link
                key={cls.id}
                to={`/dashboard/projects/${projectId}/classes/${cls.id}`}
                className={`flex items-center justify-between p-4 hover:bg-accent/50 transition-colors ${
                  index !== project.classes.length - 1 ? "border-b" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{cls.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <DomainWithFavicon domain={cls.domain} />
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
          {project.classes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No classes yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add a class to start tracking keywords</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <ProjectSettingsDialog
        project={project}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
