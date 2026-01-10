import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Globe, Monitor, Smartphone, Tablet, Calendar, Loader2, Settings, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjectClass, useProject, useCheckRankings, useDeleteKeywords, useAddKeywords } from "@/hooks/useProjects";
import { RankingStatsCards } from "@/components/projects/RankingStatsCards";
import { KeywordsTable } from "@/components/projects/KeywordsTable";
import { CheckProgressDialog } from "@/components/projects/CheckProgressDialog";
import { ExportButton } from "@/components/projects/ExportButton";
import { ClassSettingsDialog } from "@/components/projects/ClassSettingsDialog";
import { AddKeywordsDialog } from "@/components/projects/AddKeywordsDialog";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { CompetitorsFaviconList } from "@/components/projects/CompetitorsFaviconList";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const deleteKeywords = useDeleteKeywords();
  const addKeywords = useAddKeywords();
  const [isChecking, setIsChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ current: 0, total: 0, keyword: "" });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Add keywords handler
  const handleAddKeywords = async (keywords: string[]) => {
    if (!classId) return;
    await addKeywords.mutateAsync({ classId, keywords });
    refetch();
  };

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

  // Refresh only selected keywords
  const handleRefreshSelected = async (keywordIds: string[]) => {
    if (keywordIds.length === 0) return;
    setIsChecking(true);
    setCheckProgress({ current: 0, total: keywordIds.length, keyword: "" });
    try {
      await checkRankings.mutateAsync({ classId, keywordIds });
      refetch();
    } catch (error) {
      console.error("Check failed:", error);
    } finally {
      setIsChecking(false);
    }
  };

  // Delete selected keywords
  const handleDeleteKeywords = async (keywordIds: string[]) => {
    if (keywordIds.length === 0) return;
    try {
      await deleteKeywords.mutateAsync(keywordIds);
      refetch();
    } catch (error) {
      console.error("Delete failed:", error);
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
              <DomainWithFavicon domain={projectClass.domain} showFullDomain />
              <span className="text-muted-foreground/50">•</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 font-normal">
                    <Globe className="h-3 w-3" />
                    {projectClass.country_name}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{projectClass.language_name}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 font-normal">
                    <DeviceIcon className="h-3 w-3" />
                    {projectClass.device}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Device type</TooltipContent>
              </Tooltip>
              {projectClass.schedule && (
                <Badge variant="secondary" className="gap-1 font-normal">
                  <Calendar className="h-3 w-3" />
                  {projectClass.schedule}
                </Badge>
              )}
              {projectClass.last_checked_at && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(projectClass.last_checked_at), { addSuffix: true })}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Last checked</TooltipContent>
                </Tooltip>
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
        <CompetitorsFaviconList domains={projectClass.competitor_domains} maxVisible={3} />
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
          <AddKeywordsDialog onAddKeywords={handleAddKeywords} isLoading={addKeywords.isPending} />
        </div>
        <KeywordsTable 
          keywords={projectClass.keywords} 
          competitorDomains={projectClass.competitor_domains}
          userDomain={projectClass.domain}
          onDeleteKeywords={handleDeleteKeywords}
          onRefreshKeywords={handleRefreshSelected}
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
