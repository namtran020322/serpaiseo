import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Label } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { RankingStats } from "@/hooks/useProjects";
import { formatDistanceToNow } from "date-fns";

interface RankingDistributionChartProps {
  stats: RankingStats;
  lastUpdatedAt?: string | null;
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
    color: "hsl(24, 95%, 53%)",
  },
  top100: {
    label: "Top 31-100",
    color: "hsl(0, 0%, 45%)",
  },
  notFound: {
    label: "Not Found",
    color: "hsl(0, 0%, 15%)",
  },
} satisfies ChartConfig;

const legendColors: Record<string, string> = {
  top3: "bg-emerald-500",
  top10: "bg-blue-500",
  top30: "bg-orange-500",
  top100: "bg-gray-500",
  notFound: "bg-slate-900 dark:bg-slate-100",
};

export function RankingDistributionChart({ stats, lastUpdatedAt }: RankingDistributionChartProps) {
  const data = [
    { name: "top3", label: "Top 1-3", value: stats.top3, fill: "var(--color-top3)" },
    { name: "top10", label: "Top 4-10", value: stats.top10, fill: "var(--color-top10)" },
    { name: "top30", label: "Top 11-30", value: stats.top30, fill: "var(--color-top30)" },
    { name: "top100", label: "Top 31-100", value: stats.top100, fill: "var(--color-top100)" },
    { name: "notFound", label: "Not Found", value: stats.notFound, fill: "var(--color-notFound)" },
  ].filter((d) => d.value > 0);

  const total = stats.total || 1;

  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-900">
      <CardHeader>
        <CardTitle>Ranking Distribution</CardTitle>
        <CardDescription>Keywords by ranking position</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <>
            <div className="flex items-start gap-6">
              {/* Chart column with health text below */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                <ChartContainer config={chartConfig} className="aspect-square h-[280px] w-full">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={85}
                      outerRadius={120}
                      cornerRadius={6}
                      paddingAngle={2}
                      strokeWidth={0}
                      dataKey="value"
                      nameKey="label"
                    >
                      {data.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 8} className="fill-foreground text-3xl font-bold">
                                  {total}
                                </tspan>
                                <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 14} className="fill-muted-foreground text-[10px] uppercase tracking-wider">
                                  Total Keywords
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
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
                <div className="text-center mt-2">
                  <h3 className="text-lg font-bold">Distribution health</h3>
                  <p className="text-sm text-muted-foreground">
                    Updated {lastUpdatedAt ? formatDistanceToNow(new Date(lastUpdatedAt), { addSuffix: true }) : 'never'}
                  </p>
                </div>
              </div>

              {/* Compact pill legend */}
              <div className="flex flex-col gap-1.5 w-[220px] flex-shrink-0">
                {data.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full shadow-sm"
                  >
                    <span className={`w-3 h-3 rounded-full ${legendColors[item.name]}`} />
                    <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                    <span className="text-sm font-semibold text-muted-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No ranking data available
          </div>
        )}
      </CardContent>
    </div>
  );
}
