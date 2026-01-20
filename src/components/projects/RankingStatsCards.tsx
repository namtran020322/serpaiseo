import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
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
    { key: "total", label: "Total Keywords", value: stats.total },
    { key: "top3", label: "Top 1-3", value: stats.top3 },
    { key: "top10", label: "Top 4-10", value: stats.top10 },
    { key: "top30", label: "Top 11-30", value: stats.top30 },
    { key: "top100", label: "Top 31-100", value: stats.top100 },
    { key: "notFound", label: "Not Found", value: stats.notFound },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const isTotal = card.key === "total";
        const percentage = !isTotal && total > 0 ? Math.round((card.value / total) * 100) : 0;
        const improved = !isTotal ? getImproved(card.key) : 0;
        const declined = !isTotal ? getDeclined(card.key) : 0;

        return (
          <Card key={card.key}>
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-col gap-0.5">
                {/* Row 1: Label */}
                <span className="text-sm text-muted-foreground">{card.label}</span>
                
                {/* Row 2: Value + Percentage */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold">{card.value}</span>
                  {!isTotal && (
                    <span className="text-sm text-muted-foreground">{percentage}%</span>
                  )}
                </div>
                
                {/* Row 3: Trend indicators (always visible for non-total) */}
                {!isTotal && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-0.5 text-primary">
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
  );
}
