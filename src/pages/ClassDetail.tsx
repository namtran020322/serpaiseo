import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Globe, Monitor, Smartphone, Tablet, Calendar, Loader2, Settings, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject, useDeleteKeywords, useAddKeywords } from "@/hooks/useProjects";
import { useKeywordsPaginated, useClassRankingStats, useClassMetadata } from "@/hooks/useKeywordsPaginated";
import { useAddRankingJob } from "@/hooks/useRankingQueue";
import { useRankingDates, useHistoricalKeywords, useHistoricalStats } from "@/hooks/useRankingDates";
import { RankingStatsCards } from "@/components/projects/RankingStatsCards";
import { RankingHistoryChart } from "@/components/projects/RankingHistoryChart";
import { KeywordsTable } from "@/components/projects/KeywordsTable";
import { ExportButton } from "@/components/projects/ExportButton";
import { ClassSettingsDialog } from "@/components/projects/ClassSettingsDialog";
import { AddKeywordsDialog } from "@/components/projects/AddKeywordsDialog";
import { HistoryDatePicker } from "@/components/projects/HistoryDatePicker";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { CompetitorsFaviconList } from "@/components/projects/CompetitorsFaviconList";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow, format } from "date-fns";
import { useTaskProgress } from "@/contexts/TaskProgressContext";

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

// ClassDetail page for keyword ranking management
export default function ClassDetail() {
  const { projectId, classId } = useParams();
  const navigate = useNavigate();
  
  // Pagination and filter state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDesc, setSortDesc] = useState(false);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date | undefined>(undefined);

  // Data hooks - server-side pagination
  const { data: classMetadata, isLoading: metaLoading } = useClassMetadata(classId);
  const { data: rankingStats, refetch: refetchStats } = useClassRankingStats(classId);
  
  // Fetch dates that have ranking history data
  const { data: datesWithData = [], isLoading: datesLoading } = useRankingDates(classId);
  
  // Convert selectedHistoryDate to string format for query
  const selectedDateStr = selectedHistoryDate ? format(selectedHistoryDate, "yyyy-MM-dd") : undefined;
  
  // Fetch historical stats when date is selected
  const { data: historicalStats } = useHistoricalStats(classId, selectedDateStr);
  
  // Fetch current keywords (when no history date selected)
  const { data: keywordsData, isLoading: keywordsLoading, refetch: refetchKeywords } = useKeywordsPaginated({
    classId: classId || "",
    page,
    pageSize,
    sortBy,
    sortDesc,
    search,
    tierFilter,
  });
  
  // Fetch historical keywords (when a history date is selected)
  const { data: historicalData, isLoading: historicalLoading } = useHistoricalKeywords(
    classId,
    selectedDateStr,
    page,
    pageSize,
    search
  );
  
  // Determine which data to display
  const isViewingHistory = !!selectedHistoryDate;
  const displayKeywords = isViewingHistory ? (historicalData?.keywords || []) : (keywordsData?.keywords || []);
  const displayTotalCount = isViewingHistory ? (historicalData?.totalCount || 0) : (keywordsData?.totalCount || 0);
  const displayLoading = isViewingHistory ? historicalLoading : keywordsLoading;
  
  const { data: project } = useProject(projectId);
  const addRankingJob = useAddRankingJob();
  const deleteKeywords = useDeleteKeywords();
  const addKeywords = useAddKeywords();
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Check if class has running task (anti-spam refresh)
  const { tasks } = useTaskProgress();
  const isClassRunning = tasks.some(
    (t) => t.classId === classId && (t.status === "pending" || t.status === "processing")
  );

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

  const handleTierClick = (tier: string | null) => {
    setTierFilter(tier);
    setPage(0); // Reset to first page on filter change
  };

  // Build projectClass-like object for components that need it
  const projectClassForExport = {
    ...classMetadata,
    keywords: displayKeywords || [],
    keywordCount: displayTotalCount || 0,
    rankingStats: rankingStats || { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 },
  };

  // Handler for date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedHistoryDate(date);
    setPage(0); // Reset to first page
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
          <HistoryDatePicker
            datesWithData={datesWithData}
            selectedDate={selectedHistoryDate}
            onDateSelect={handleDateSelect}
            isLoading={datesLoading}
          />
          <Button onClick={handleRefresh} disabled={addRankingJob.isPending || isViewingHistory || isClassRunning}>
            <RefreshCw className={`mr-2 h-4 w-4 ${addRankingJob.isPending || isClassRunning ? "animate-spin" : ""}`} />
            {isClassRunning ? "Checking..." : addRankingJob.isPending ? "Starting..." : "Refresh Rankings"}
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
          <RankingStatsCards 
            stats={
              isViewingHistory && historicalStats 
                ? historicalStats 
                : (rankingStats || { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 })
            } 
            activeTier={isViewingHistory ? null : tierFilter}
            onTierClick={isViewingHistory ? undefined : handleTierClick}
            historyDate={selectedHistoryDate}
          />
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
            <h2 className="text-xl font-semibold">
              Keywords
              {isViewingHistory && selectedHistoryDate && (
                <Badge variant="secondary" className="ml-2">
                  {format(selectedHistoryDate, "dd/MM/yyyy")}
                </Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {displayTotalCount} keywords {isViewingHistory ? "recorded" : "tracked"}
            </p>
          </div>
          {!isViewingHistory && (
            <AddKeywordsDialog onAddKeywords={handleAddKeywords} isLoading={addKeywords.isPending} />
          )}
        </div>
        <KeywordsTable 
          keywords={displayKeywords} 
          competitorDomains={classMetadata.competitor_domains}
          userDomain={classMetadata.domain}
          onDeleteKeywords={isViewingHistory ? undefined : handleDeleteKeywords}
          onRefreshKeywords={isViewingHistory ? undefined : handleRefreshSelected}
          // Server-side pagination props
          totalCount={displayTotalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
          onSortChange={isViewingHistory ? undefined : handleSortChange}
          onSearchChange={handleSearchChange}
          isLoading={displayLoading}
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
