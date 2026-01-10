import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { RankingStats } from "@/hooks/useProjects";

interface RankingDistributionChartProps {
  stats: RankingStats;
}

const COLORS = [
  "hsl(160, 84%, 39%)", // emerald - top 1-3
  "hsl(217, 91%, 60%)", // blue - top 4-10
  "hsl(38, 92%, 50%)",  // amber - top 11-30
  "hsl(24, 95%, 53%)",  // orange - top 31-100
  "hsl(0, 84%, 60%)",   // red - not found
];

export function RankingDistributionChart({ stats }: RankingDistributionChartProps) {
  const data = [
    { name: "Top 1-3", value: stats.top3, color: COLORS[0] },
    { name: "Top 4-10", value: stats.top10, color: COLORS[1] },
    { name: "Top 11-30", value: stats.top30, color: COLORS[2] },
    { name: "Top 31-100", value: stats.top100, color: COLORS[3] },
    { name: "Not Found", value: stats.notFound, color: COLORS[4] },
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
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value} (${Math.round((value / total) * 100)}%)`,
                  name,
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No ranking data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
