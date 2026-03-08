import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { RankingStats } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface RankingStatsCardsProps {
  stats: RankingStats;
  activeTier?: string | null;
  onTierClick?: (tier: string | null) => void;
  historyDate?: Date;
}

export function RankingStatsCards({ stats, activeTier, onTierClick, historyDate }: RankingStatsCardsProps) {
  const total = stats.total || 1;

  const getImproved = (key: string): number => {
    return (stats as any)[`${key}_improved`] || 0;
  };
  
  const getDeclined = (key: string): number => {
    return (stats as any)[`${key}_declined`] || 0;
  };

  const cards = [
    { key: "total", label: "Total Keywords", value: stats.total },
    { key: "top3", label: "Top 1-3", value: stats.top3 },
    { key: "top10", label: "Top 4-10", value: stats.top10 },
    { key: "top30", label: "Top 11-30", value: stats.top30 },
    { key: "top100", label: "Top 31-100", value: stats.top100 },
    { key: "notFound", label: "Not Found", value: stats.notFound },
  ];

  // Badge color mapping per tier
  const getBadgeClasses = (key: string): string => {
    switch (key) {
      case "top3":
        return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "top10":
        return "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
      case "top30":
        return "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400";
      case "top100":
        return "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
      case "notFound":
        return "bg-red-100 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "";
    }
  };

  const getValueColor = (key: string): string => {
    switch (key) {
      case "top3": return "text-emerald-600 dark:text-emerald-400";
      case "top10": return "text-blue-600 dark:text-blue-400";
      case "top30": return "text-amber-600 dark:text-amber-400";
      default: return "";
    }
  };

  const handleCardClick = (key: string) => {
    if (!onTierClick) return;
    onTierClick(activeTier === key ? null : key);
  };

  return (
    <div className="space-y-3">
      {historyDate && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Viewing statistics for
          </span>
          <Badge variant="secondary">
            {format(historyDate, "dd/MM/yyyy")}
          </Badge>
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => {
          const isTotal = card.key === "total";
          const percentage = !isTotal && total > 0 ? Math.round((card.value / total) * 100) : 0;
          const improved = !isTotal ? getImproved(card.key) : 0;
          const declined = !isTotal ? getDeclined(card.key) : 0;
          const isActive = activeTier === card.key;
          const isClickable = !isTotal && !!onTierClick;

          return (
            <Card 
              key={card.key}
              className={cn(
                "transition-all duration-200 bg-slate-50 dark:bg-slate-900",
                isClickable && "cursor-pointer hover:border-primary/50 hover:shadow-sm",
                isActive && "ring-2 ring-primary border-primary"
              )}
              onClick={() => !isTotal && handleCardClick(card.key)}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex flex-col gap-0.5">
                  {/* Row 1: Label */}
                  <span className="text-sm text-muted-foreground">{card.label}</span>
                  
                  {/* Row 2: Value + Percentage Badge */}
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-3xl font-bold", getValueColor(card.key))}>{card.value}</span>
                    {!isTotal && (
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs font-medium px-1.5 py-0", getBadgeClasses(card.key))}
                      >
                        {percentage}%
                      </Badge>
                    )}
                  </div>
                  
                  {/* Row 3: Trend indicators */}
                  {!isTotal && !historyDate && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-0.5 text-emerald-600">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {improved}
                      </span>
                      <span className="flex items-center gap-0.5 text-destructive">
                        <TrendingDown className="h-3.5 w-3.5" />
                        {declined}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
