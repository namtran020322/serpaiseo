import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useRankingHistory, TimeRange, DomainConfig } from "@/hooks/useRankingHistory";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { format, parseISO } from "date-fns";

interface RankingHistoryChartProps {
  classId: string;
  userDomain: string;
  competitorDomains: string[];
}

export function RankingHistoryChart({
  classId,
  userDomain,
  competitorDomains,
}: RankingHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [visibleDomains, setVisibleDomains] = useState<Set<string>>(
    new Set([userDomain, ...competitorDomains])
  );

  const { data: historyData, isLoading } = useRankingHistory(
    classId,
    userDomain,
    competitorDomains,
    timeRange
  );

  const toggleDomain = (domain: string) => {
    setVisibleDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    historyData?.domains.forEach((d: DomainConfig) => {
      config[d.domain] = {
        label: d.domain,
        color: d.color,
      };
    });
    return config;
  }, [historyData?.domains]);

  // Custom tooltip content with favicons
  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const date = label ? format(parseISO(label), "MMM d, yyyy") : "";

    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="mb-2 font-medium text-sm">{date}</p>
        <div className="space-y-1.5">
          {payload
            .filter((entry: any) => entry.value !== null)
            .sort((a: any, b: any) => (a.value || 999) - (b.value || 999))
            .map((entry: any) => (
              <div
                key={entry.dataKey}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <DomainWithFavicon domain={entry.dataKey} size="sm" />
                <span
                  className="font-medium tabular-nums"
                  style={{ color: entry.color }}
                >
                  #{entry.value}
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!historyData || historyData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ranking History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              No ranking history available yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Rankings will be recorded each time you refresh.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Ranking History</CardTitle>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value as TimeRange)}
            className="justify-start"
          >
            <ToggleGroupItem value="7d" aria-label="Last 7 days" size="sm">
              7 days
            </ToggleGroupItem>
            <ToggleGroupItem value="30d" aria-label="Last 30 days" size="sm">
              30 days
            </ToggleGroupItem>
            <ToggleGroupItem value="3m" aria-label="Last 3 months" size="sm">
              3 months
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Domain visibility toggles */}
        <div className="flex flex-wrap gap-4">
          {historyData.domains.map((domainConfig: DomainConfig) => (
            <label
              key={domainConfig.domain}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={visibleDomains.has(domainConfig.domain)}
                onCheckedChange={() => toggleDomain(domainConfig.domain)}
                style={
                  {
                    "--checkbox-color": domainConfig.color,
                    borderColor: domainConfig.color,
                    backgroundColor: visibleDomains.has(domainConfig.domain)
                      ? domainConfig.color
                      : undefined,
                  } as React.CSSProperties
                }
              />
              <DomainWithFavicon
                domain={domainConfig.domain}
                size="sm"
                className={
                  !visibleDomains.has(domainConfig.domain)
                    ? "opacity-50"
                    : undefined
                }
              />
            </label>
          ))}
        </div>

        {/* Chart */}
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={historyData.data}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => format(parseISO(value), "MMM d")}
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                reversed
                domain={[1, "auto"]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={30}
                tickFormatter={(value) => `#${value}`}
                className="text-xs fill-muted-foreground"
              />
              <ChartTooltip content={<CustomTooltipContent />} />
              {historyData.domains.map((domainConfig: DomainConfig) =>
                visibleDomains.has(domainConfig.domain) ? (
                  <Line
                    key={domainConfig.domain}
                    type="monotone"
                    dataKey={domainConfig.domain}
                    stroke={domainConfig.color}
                    strokeWidth={domainConfig.isUser ? 3 : 2}
                    dot={{
                      r: domainConfig.isUser ? 4 : 3,
                      fill: domainConfig.color,
                      strokeWidth: 0,
                    }}
                    activeDot={{
                      r: 6,
                      fill: domainConfig.color,
                      stroke: "hsl(var(--background))",
                      strokeWidth: 2,
                    }}
                    connectNulls
                  />
                ) : null
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
