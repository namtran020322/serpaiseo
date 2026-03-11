import { Link } from "react-router-dom";
import { FolderOpen, Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

import { useLanguage } from "@/contexts/LanguageContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { RankingDistributionChart } from "@/components/projects/RankingDistributionChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user } = useAuthContext();
  const { t } = useLanguage();
  const { data: stats, isLoading } = useDashboardStats();
  const userName = user?.user_metadata?.full_name || "there";

  return (
    <div className="space-y-6">
      <AnnouncementBanner />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.hello", { name: userName })}</h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.welcome")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/dashboard/projects" className="bg-muted/50 rounded-2xl p-6 hover:bg-muted/70 transition-colors group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("dashboard.totalProjects")}</p>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <p className="text-3xl font-bold mt-1">{stats?.totalProjects ?? 0}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Link>

        <div className="bg-muted/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("dashboard.totalKeywords")}</p>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <p className="text-3xl font-bold mt-1">{stats?.totalKeywords ?? 0}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Search className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("dashboard.checksToday")}</p>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <p className="text-3xl font-bold mt-1">{stats?.checksToday ?? 0}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Top Movers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ranking Distribution */}
        {isLoading ? (
          <div className="rounded-2xl bg-muted/50 p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-[280px] w-full" />
          </div>
        ) : stats ? (
          <RankingDistributionChart stats={stats.rankingDistribution} />
        ) : null}

        {/* Top Movers */}
        <div className="rounded-2xl bg-muted/50 p-6">
          <h3 className="text-lg font-semibold">{t("dashboard.topMovers")}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t("dashboard.topMovers.desc")}</p>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : !stats?.topMovers.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">{t("dashboard.noMovers")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("dashboard.noMovers.desc")}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
              {stats.topMovers.map((mover, idx) => {
                const isUp = mover.change > 0;
                return (
                  <Link
                    key={`${mover.classId}-${mover.keyword}-${idx}`}
                    to={`/dashboard/projects/${mover.projectId}/classes/${mover.classId}`}
                    className="flex items-center justify-between bg-background rounded-xl p-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{mover.keyword}</p>
                      <p className="text-xs text-muted-foreground truncate">{mover.className}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-medium tabular-nums">
                          #{mover.currentPosition}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ← #{mover.previousPosition}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`gap-0.5 text-xs font-semibold ${
                          isUp
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(mover.change)}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
