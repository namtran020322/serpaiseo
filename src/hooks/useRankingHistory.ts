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

interface PositionWithTimestamp {
  position: number;
  timestamp: string;
}

// Get the last (latest) position of the day
function getLastPosition(positions: PositionWithTimestamp[]): number | null {
  if (positions.length === 0) return null;
  const sorted = [...positions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return sorted[0].position;
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

      // Group by date - store positions with timestamps
      const dateMap = new Map<
        string,
        {
          userPositions: PositionWithTimestamp[];
          competitorPositions: Map<string, PositionWithTimestamp[]>;
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

        // User domain position with timestamp
        if (record.ranking_position !== null) {
          dayData.userPositions.push({
            position: record.ranking_position,
            timestamp: record.checked_at,
          });
        }

        // Competitor positions - handle as Object (key-value pairs)
        if (record.competitor_rankings) {
          const rankings = record.competitor_rankings as Record<
            string,
            { position: number | null; url?: string | null }
          >;

          // Iterate over object keys
          Object.entries(rankings).forEach(([domain, data]) => {
            if (data && data.position !== null) {
              if (!dayData.competitorPositions.has(domain)) {
                dayData.competitorPositions.set(domain, []);
              }
              dayData.competitorPositions.get(domain)!.push({
                position: data.position,
                timestamp: record.checked_at,
              });
            }
          });
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

        // User domain - get last position of the day
        dataPoint[userDomain] = getLastPosition(dayData.userPositions);

        // Competitor domains - get last position of the day
        competitorDomains.forEach((domain) => {
          const positions = dayData.competitorPositions.get(domain);
          dataPoint[domain] = positions ? getLastPosition(positions) : null;
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
