import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { RankingStats } from "@/hooks/useProjects";

interface RankingDistributionChartProps {
  stats: RankingStats;
}

const chartConfig = {
  top3: {
    label: "Top 1-3",
    color: "hsl(160, 84%, 39%)", // emerald
  },
  top10: {
    label: "Top 4-10",
    color: "hsl(217, 91%, 60%)", // blue
  },
  top30: {
    label: "Top 11-30",
    color: "hsl(24, 95%, 53%)", // coral/orange
  },
  top100: {
    label: "Top 31-100",
    color: "hsl(0, 0%, 45%)", // gray
  },
  notFound: {
    label: "Not Found",
    color: "hsl(0, 0%, 15%)", // dark/black
  },
} satisfies ChartConfig;

const legendColors: Record<string, string> = {
  top3: "bg-emerald-500",
  top10: "bg-blue-500",
  top30: "bg-orange-500",
  top100: "bg-gray-500",
  notFound: "bg-slate-900 dark:bg-slate-100",
};

export function RankingDistributionChart({ stats }: RankingDistributionChartProps) {
  const data = [
    { name: "top3", label: "Top 1-3", value: stats.top3, fill: "var(--color-top3)" },
    { name: "top10", label: "Top 4-10", value: stats.top10, fill: "var(--color-top10)" },
    { name: "top30", label: "Top 11-30", value: stats.top30, fill: "var(--color-top30)" },
    { name: "top100", label: "Top 31-100", value: stats.top100, fill: "var(--color-top100)" },
    { name: "notFound", label: "Not Found", value: stats.notFound, fill: "var(--color-notFound)" },
  ].filter((d) => d.value > 0);

  const total = stats.total || 1;

  return (
    <Card className="bg-slate-50 dark:bg-slate-900">
      <CardHeader>
        <CardTitle>Ranking Distribution</CardTitle>
        <CardDescription>Keywords by ranking position</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="flex items-center gap-6">
            {/* Chart on the left */}
            <ChartContainer config={chartConfig} className="aspect-square h-[200px] flex-shrink-0">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="label"
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <span>
                          {name}: {value} ({Math.round((Number(value) / total) * 100)}%)
                        </span>
                      )}
                    />
                  }
                />
              </PieChart>
            </ChartContainer>

            {/* Custom pill legend on the right */}
            <div className="flex flex-col gap-2 flex-1">
              {data.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm"
                >
                  <span className={`w-3 h-3 rounded-full ${legendColors[item.name]}`} />
                  <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                  <span className="text-sm font-semibold text-muted-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No ranking data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
