import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Award, Target, BarChart3, XCircle } from "lucide-react";
import { RankingStats } from "@/hooks/useProjects";

interface RankingStatsCardsProps {
  stats: RankingStats;
}

export function RankingStatsCards({ stats }: RankingStatsCardsProps) {
  const cards = [
    {
      label: "Top 1-3",
      value: stats.top3,
      icon: Award,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Top 4-10",
      value: stats.top10,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Top 11-30",
      value: stats.top30,
      icon: Target,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Top 31-100",
      value: stats.top100,
      icon: BarChart3,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      label: "Not Found",
      value: stats.notFound,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  const totalFound = stats.top3 + stats.top10 + stats.top30 + stats.top100;
  const avgPosition = stats.total > 0 
    ? Math.round((stats.top3 * 2 + stats.top10 * 7 + stats.top30 * 20 + stats.top100 * 65) / (totalFound || 1))
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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

      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
