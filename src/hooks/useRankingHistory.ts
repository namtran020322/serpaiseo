import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, subMonths, format, parseISO } from "date-fns";

export type TimeRange = "7d" | "30d" | "3m";

export interface RankingDataPoint {
  date: string;
  [domain: string]: number | string | null;
}

export interface DomainConfig {
  domain: string;
  color: string;
  isUser: boolean;
}

// Color palette for domains
const DOMAIN_COLORS = [
  "hsl(var(--primary))", // Primary for user domain
  "hsl(221, 83%, 53%)",  // Blue
  "hsl(142, 71%, 45%)",  // Green
  "hsl(38, 92%, 50%)",   // Amber
  "hsl(262, 83%, 58%)",  // Purple
  "hsl(0, 84%, 60%)",    // Red
  "hsl(199, 89%, 48%)",  // Cyan
  "hsl(24, 95%, 53%)",   // Orange
  "hsl(280, 65%, 60%)",  // Violet
  "hsl(160, 60%, 45%)",  // Teal
];

function getStartDate(timeRange: TimeRange): Date {
  const now = new Date();
  switch (timeRange) {
    case "7d":
      return subDays(now, 7);
    case "30d":
      return subDays(now, 30);
    case "3m":
      return subMonths(now, 3);
    default:
      return subDays(now, 7);
  }
}

interface CompetitorRanking {
  domain: string;
  position: number | null;
  url?: string | null;
}

export function useRankingHistory(
  classId: string | undefined,
  userDomain: string,
  competitorDomains: string[],
  timeRange: TimeRange
) {
  return useQuery({
    queryKey: ["rankingHistory", classId, timeRange],
    queryFn: async () => {
      if (!classId) return { data: [], domains: [] };

      const startDate = getStartDate(timeRange);

      // First get keyword IDs for this class
      const { data: keywords, error: keywordsError } = await supabase
        .from("project_keywords")
        .select("id")
        .eq("class_id", classId);

      if (keywordsError) throw keywordsError;
      if (!keywords || keywords.length === 0) return { data: [], domains: [] };

      const keywordIds = keywords.map((k) => k.id);

      // Fetch ranking history
      const { data: history, error: historyError } = await supabase
        .from("keyword_ranking_history")
        .select("*")
        .in("keyword_id", keywordIds)
        .gte("checked_at", startDate.toISOString())
        .order("checked_at", { ascending: true });

      if (historyError) throw historyError;
      if (!history || history.length === 0) return { data: [], domains: [] };

      // Group by date and calculate average positions
      const dateMap = new Map<
        string,
        {
          userPositions: number[];
          competitorPositions: Map<string, number[]>;
        }
      >();

      history.forEach((record) => {
        const dateKey = format(parseISO(record.checked_at), "yyyy-MM-dd");

        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            userPositions: [],
            competitorPositions: new Map(),
          });
        }

        const dayData = dateMap.get(dateKey)!;

        // User domain position
        if (record.ranking_position !== null) {
          dayData.userPositions.push(record.ranking_position);
        }

        // Competitor positions
        if (record.competitor_rankings) {
          const rankings = record.competitor_rankings as unknown as CompetitorRanking[];
          if (Array.isArray(rankings)) {
            rankings.forEach((cr) => {
              if (cr.position !== null && cr.domain) {
                if (!dayData.competitorPositions.has(cr.domain)) {
                  dayData.competitorPositions.set(cr.domain, []);
                }
                dayData.competitorPositions.get(cr.domain)!.push(cr.position);
              }
            });
          }
        }
      });

      // Build chart data
      const chartData: RankingDataPoint[] = [];
      const allDomains = new Set<string>([userDomain, ...competitorDomains]);

      // Sort dates
      const sortedDates = Array.from(dateMap.keys()).sort();

      sortedDates.forEach((dateKey) => {
        const dayData = dateMap.get(dateKey)!;
        const dataPoint: RankingDataPoint = {
          date: dateKey,
        };

        // User domain average
        if (dayData.userPositions.length > 0) {
          const avg =
            dayData.userPositions.reduce((a, b) => a + b, 0) /
            dayData.userPositions.length;
          dataPoint[userDomain] = Math.round(avg * 10) / 10;
        } else {
          dataPoint[userDomain] = null;
        }

        // Competitor averages
        competitorDomains.forEach((domain) => {
          const positions = dayData.competitorPositions.get(domain);
          if (positions && positions.length > 0) {
            const avg = positions.reduce((a, b) => a + b, 0) / positions.length;
            dataPoint[domain] = Math.round(avg * 10) / 10;
          } else {
            dataPoint[domain] = null;
          }
        });

        chartData.push(dataPoint);
      });

      // Build domain configs
      const domainConfigs: DomainConfig[] = [
        { domain: userDomain, color: DOMAIN_COLORS[0], isUser: true },
        ...competitorDomains.map((domain, index) => ({
          domain,
          color: DOMAIN_COLORS[(index + 1) % DOMAIN_COLORS.length],
          isUser: false,
        })),
      ];

      return { data: chartData, domains: domainConfigs };
    },
    enabled: !!classId,
    staleTime: 60 * 1000, // 1 minute
  });
}
