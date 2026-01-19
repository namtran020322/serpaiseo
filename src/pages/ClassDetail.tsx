import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Globe, Monitor, Smartphone, Tablet, Calendar, Loader2, Settings, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject, useDeleteKeywords, useAddKeywords } from "@/hooks/useProjects";
import { useKeywordsPaginated, useClassRankingStats, useClassMetadata } from "@/hooks/useKeywordsPaginated";
import { useAddRankingJob } from "@/hooks/useRankingQueue";
import { RankingStatsCards } from "@/components/projects/RankingStatsCards";
import { RankingHistoryChart } from "@/components/projects/RankingHistoryChart";
import { KeywordsTable } from "@/components/projects/KeywordsTable";
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
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDesc, setSortDesc] = useState(false);
  const [search, setSearch] = useState("");

  // Data hooks - server-side pagination
  const { data: classMetadata, isLoading: metaLoading } = useClassMetadata(classId);
  const { data: rankingStats, refetch: refetchStats } = useClassRankingStats(classId);
  const { data: keywordsData, isLoading: keywordsLoading, refetch: refetchKeywords } = useKeywordsPaginated({
    classId: classId || "",
    page,
    pageSize,
    sortBy,
    sortDesc,
    search,
  });
  
  const { data: project } = useProject(projectId);
  const addRankingJob = useAddRankingJob();
  const deleteKeywords = useDeleteKeywords();
  const addKeywords = useAddKeywords();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refetchAll = () => {
    refetchStats();
    refetchKeywords();
  };

  // Add keywords handler
  const handleAddKeywords = async (keywords: string[]) => {
    if (!classId) return;
    await addKeywords.mutateAsync({ classId, keywords });
    refetchAll();
  };

  if (metaLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading class...</p>
      </div>
    );
  }

  if (!classMetadata) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-destructive">Class not found</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const DeviceIcon = deviceIcons[classMetadata.device as keyof typeof deviceIcons] || Monitor;

  // Refresh all keywords - queue system (background)
  const handleRefresh = () => {
    if (!classId || !classMetadata) return;
    addRankingJob.mutate({
      classId,
      className: classMetadata.name,
    });
  };

  // Refresh only selected keywords - queue system (background)
  const handleRefreshSelected = (keywordIds: string[]) => {
    if (keywordIds.length === 0 || !classId || !classMetadata) return;
    addRankingJob.mutate({
      classId,
      className: classMetadata.name,
      keywordIds,
    });
  };

  // Delete selected keywords
  const handleDeleteKeywords = async (keywordIds: string[]) => {
    if (keywordIds.length === 0) return;
    try {
      await deleteKeywords.mutateAsync(keywordIds);
      refetchAll();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleSortChange = (newSortBy: string | undefined, newSortDesc: boolean) => {
    setSortBy(newSortBy);
    setSortDesc(newSortDesc);
    setPage(0); // Reset to first page on sort change
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(0); // Reset to first page on search
  };

  // Build projectClass-like object for components that need it
  const projectClassForExport = {
    ...classMetadata,
    keywords: keywordsData?.keywords || [],
    keywordCount: keywordsData?.totalCount || 0,
    rankingStats: rankingStats || { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 },
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
              <h1 className="text-3xl font-bold tracking-tight">{classMetadata.name}</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
              <DomainWithFavicon domain={classMetadata.domain} showFullDomain />
              <span className="text-muted-foreground/50">•</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 font-normal">
                    <Globe className="h-3 w-3" />
                    {classMetadata.country_name}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{classMetadata.language_name}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 font-normal">
                    <DeviceIcon className="h-3 w-3" />
                    {classMetadata.device}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Device type</TooltipContent>
              </Tooltip>
              {classMetadata.schedule && (
                <Badge variant="secondary" className="gap-1 font-normal">
                  <Calendar className="h-3 w-3" />
                  {classMetadata.schedule}
                </Badge>
              )}
              {classMetadata.last_checked_at && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(classMetadata.last_checked_at), { addSuffix: true })}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Last checked</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton projectClass={projectClassForExport} />
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button onClick={handleRefresh} disabled={addRankingJob.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${addRankingJob.isPending ? "animate-spin" : ""}`} />
            {addRankingJob.isPending ? "Starting..." : "Refresh Rankings"}
          </Button>
        </div>
      </div>

      {/* Competitor Domains */}
      {classMetadata.competitor_domains && classMetadata.competitor_domains.length > 0 && (
        <CompetitorsFaviconList domains={classMetadata.competitor_domains} maxVisible={3} />
      )}

      {/* Stats & Chart Tabs */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="chart">Ranking Chart</TabsTrigger>
        </TabsList>
        <TabsContent value="stats" className="mt-4">
          <RankingStatsCards stats={rankingStats || { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 }} />
        </TabsContent>
        <TabsContent value="chart" className="mt-4">
          <RankingHistoryChart
            classId={classId!}
            userDomain={classMetadata.domain}
            competitorDomains={classMetadata.competitor_domains || []}
          />
        </TabsContent>
      </Tabs>

      {/* Keywords Section - Server-side pagination */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Keywords</h2>
            <p className="text-sm text-muted-foreground">
              {keywordsData?.totalCount || 0} keywords tracked
            </p>
          </div>
          <AddKeywordsDialog onAddKeywords={handleAddKeywords} isLoading={addKeywords.isPending} />
        </div>
        <KeywordsTable 
          keywords={keywordsData?.keywords || []} 
          competitorDomains={classMetadata.competitor_domains}
          userDomain={classMetadata.domain}
          onDeleteKeywords={handleDeleteKeywords}
          onRefreshKeywords={handleRefreshSelected}
          // Server-side pagination props
          totalCount={keywordsData?.totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
          onSortChange={handleSortChange}
          onSearchChange={handleSearchChange}
          isLoading={keywordsLoading}
        />
      </div>

      {/* Settings Dialog */}
      <ClassSettingsDialog
        projectClass={projectClassForExport}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
