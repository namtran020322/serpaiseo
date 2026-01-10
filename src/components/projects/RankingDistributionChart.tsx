import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { RankingStats } from "@/hooks/useProjects";

interface RankingDistributionChartProps {
  stats: RankingStats;
}

const chartConfig = {
  top3: {
    label: "Top 1-3",
    color: "hsl(160, 84%, 39%)",
  },
  top10: {
    label: "Top 4-10",
    color: "hsl(217, 91%, 60%)",
  },
  top30: {
    label: "Top 11-30",
    color: "hsl(38, 92%, 50%)",
  },
  top100: {
    label: "Top 31-100",
    color: "hsl(24, 95%, 53%)",
  },
  notFound: {
    label: "Not Found",
    color: "hsl(0, 84%, 60%)",
  },
} satisfies ChartConfig;

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
    <Card>
      <CardHeader>
        <CardTitle>Ranking Distribution</CardTitle>
        <CardDescription>Keywords by ranking position</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
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
              <Legend
                formatter={(value, entry) => {
                  const item = data.find((d) => d.label === value);
                  return item ? `${item.label} (${item.value})` : value;
                }}
              />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No ranking data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
