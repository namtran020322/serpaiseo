import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Award, Target, BarChart3, XCircle, ArrowUp, ArrowDown } from "lucide-react";
import { RankingStats } from "@/hooks/useProjects";

interface RankingStatsCardsProps {
  stats: RankingStats;
}

export function RankingStatsCards({ stats }: RankingStatsCardsProps) {
  const total = stats.total || 1; // Avoid division by zero

  // Helper to get improved/declined from stats
  const getImproved = (key: string): number => {
    return (stats as any)[`${key}_improved`] || 0;
  };
  
  const getDeclined = (key: string): number => {
    return (stats as any)[`${key}_declined`] || 0;
  };

  const cards = [
    {
      key: "top3",
      label: "Top 1-3",
      value: stats.top3,
      icon: Award,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      key: "top10",
      label: "Top 4-10",
      value: stats.top10,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      key: "top30",
      label: "Top 11-30",
      value: stats.top30,
      icon: Target,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      key: "top100",
      label: "Top 31-100",
      value: stats.top100,
      icon: BarChart3,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      key: "notFound",
      label: "Not Found",
      value: stats.notFound,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {/* Total Keywords Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Keywords</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier Cards with enhanced stats */}
      {cards.map((card) => {
        const percentage = total > 0 ? Math.round((card.value / total) * 100) : 0;
        const improved = getImproved(card.key);
        const declined = getDeclined(card.key);
        const hasChanges = improved > 0 || declined > 0;

        return (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Value and Percentage */}
                  <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    <span className="text-sm text-muted-foreground">{percentage}%</span>
                  </div>
                  
                  {/* Label */}
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  
                  {/* Improved/Declined indicators */}
                  {hasChanges && (
                    <div className="flex items-center gap-3 mt-1">
                      {improved > 0 && (
                        <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                          <ArrowUp className="h-3 w-3" />
                          {improved}
                        </span>
                      )}
                      {declined > 0 && (
                        <span className="flex items-center gap-0.5 text-xs font-medium text-destructive">
                          <ArrowDown className="h-3 w-3" />
                          {declined}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
