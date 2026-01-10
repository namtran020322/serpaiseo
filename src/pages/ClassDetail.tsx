import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Globe, Monitor, Smartphone, Tablet, Calendar, Loader2, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjectClass, useProject, useCheckRankings } from "@/hooks/useProjects";
import { RankingStatsCards } from "@/components/projects/RankingStatsCards";
import { KeywordsTable } from "@/components/projects/KeywordsTable";
import { CheckProgressDialog } from "@/components/projects/CheckProgressDialog";
import { ExportButton } from "@/components/projects/ExportButton";
import { ClassSettingsDialog } from "@/components/projects/ClassSettingsDialog";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { formatDistanceToNow } from "date-fns";

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export default function ClassDetail() {
  const { projectId, classId } = useParams();
  const navigate = useNavigate();
  const { data: projectClass, isLoading, error, refetch } = useProjectClass(classId);
  const { data: project } = useProject(projectId);
  const checkRankings = useCheckRankings();
  const [isChecking, setIsChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ current: 0, total: 0, keyword: "" });
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading class...</p>
      </div>
    );
  }

  if (error || !projectClass) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-destructive">Class not found</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const DeviceIcon = deviceIcons[projectClass.device as keyof typeof deviceIcons] || Monitor;

  const handleRefresh = async () => {
    setIsChecking(true);
    setCheckProgress({ current: 0, total: projectClass.keywords.length, keyword: "" });
    try {
      await checkRankings.mutateAsync({ classId });
      refetch();
    } catch (error) {
      console.error("Check failed:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckComplete = () => {
    setIsChecking(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/dashboard/projects/${projectId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{project?.name} /</span>
              <h1 className="text-3xl font-bold tracking-tight">{projectClass.name}</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <DomainWithFavicon domain={projectClass.domain} showFullDomain />
              <span>{projectClass.country_name}</span>
              <span>{projectClass.language_name}</span>
              <span className="flex items-center gap-1">
                <DeviceIcon className="h-3 w-3" />
                {projectClass.device}
              </span>
              {projectClass.schedule && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {projectClass.schedule}
                </Badge>
              )}
              {projectClass.last_checked_at && (
                <span>
                  Last checked {formatDistanceToNow(new Date(projectClass.last_checked_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton projectClass={projectClass} />
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button onClick={handleRefresh} disabled={isChecking}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
            {isChecking ? "Checking..." : "Refresh Rankings"}
          </Button>
        </div>
      </div>

      {/* Competitor Domains */}
      {projectClass.competitor_domains && projectClass.competitor_domains.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Competitors:</span>
          {projectClass.competitor_domains.map((d) => (
            <Badge key={d} variant="outline" className="gap-1">
              <DomainWithFavicon domain={d} showFullDomain />
            </Badge>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <RankingStatsCards stats={projectClass.rankingStats} />

      {/* Keywords Section - No Card wrapper */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Keywords</h2>
            <p className="text-sm text-muted-foreground">
              {projectClass.keywordCount} keywords tracked
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Keywords
          </Button>
        </div>
        <KeywordsTable 
          keywords={projectClass.keywords} 
          competitorDomains={projectClass.competitor_domains}
        />
      </div>

      {/* Check Progress Dialog */}
      <CheckProgressDialog
        open={isChecking}
        onOpenChange={setIsChecking}
        className={projectClass.name}
        progress={checkProgress}
        onComplete={handleCheckComplete}
      />

      {/* Settings Dialog */}
      <ClassSettingsDialog
        projectClass={projectClass}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
