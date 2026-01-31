import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

// Vietnam timezone offset: +07:00
const VN_OFFSET_HOURS = 7;

/**
 * Convert UTC timestamp to Vietnam date string (yyyy-MM-dd)
 * This ensures dates are extracted based on Vietnam timezone
 */
function utcToVnDateString(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  // Add 7 hours to get Vietnam time
  const vnDate = new Date(date.getTime() + VN_OFFSET_HOURS * 60 * 60 * 1000);
  const year = vnDate.getUTCFullYear();
  const month = String(vnDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vnDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a local date string (yyyy-MM-dd) and return UTC range for querying
 * with fallback buffer of ±12 hours to handle timezone edge cases
 */
function getDateRangeForQuery(dateStr: string): { start: string; end: string } {
  // Parse as local date components
  const [year, month, day] = dateStr.split("-").map(Number);
  
  // Create date at start of day in Vietnam timezone
  // Vietnam is UTC+7, so start of day in VN = previous day 17:00 UTC
  const vnStartOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const utcStart = new Date(vnStartOfDay.getTime() - VN_OFFSET_HOURS * 60 * 60 * 1000);
  
  // End of day in VN = same day 16:59:59 UTC
  const vnEndOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  const utcEnd = new Date(vnEndOfDay.getTime() - VN_OFFSET_HOURS * 60 * 60 * 1000);
  
  // Add ±12 hour fallback buffer to ensure we don't miss data
  const startWithBuffer = new Date(utcStart.getTime() - 12 * 60 * 60 * 1000);
  const endWithBuffer = new Date(utcEnd.getTime() + 12 * 60 * 60 * 1000);
  
  return {
    start: startWithBuffer.toISOString(),
    end: endWithBuffer.toISOString(),
  };
}

/**
 * Fetches distinct dates that have ranking data for a specific class
 * from keyword_ranking_history table
 */
export function useRankingDates(classId: string | undefined) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["ranking-dates", classId, user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user || !classId) return [];

      // First get keyword IDs for this class
      const { data: keywords, error: keywordsError } = await supabase
        .from("project_keywords")
        .select("id")
        .eq("class_id", classId);

      if (keywordsError) throw keywordsError;
      if (!keywords || keywords.length === 0) return [];

      const keywordIds = keywords.map((k) => k.id);

      // Get distinct dates from ranking history
      const { data: history, error: historyError } = await supabase
        .from("keyword_ranking_history")
        .select("checked_at")
        .in("keyword_id", keywordIds)
        .order("checked_at", { ascending: false });

      if (historyError) throw historyError;
      if (!history || history.length === 0) return [];

      // Extract unique dates using Vietnam timezone
      const uniqueDates = new Set<string>();
      history.forEach((record) => {
        const date = utcToVnDateString(record.checked_at);
        uniqueDates.add(date);
      });

      return Array.from(uniqueDates).sort().reverse(); // Most recent first
    },
    enabled: !!user && !!classId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetches keyword rankings for a specific historical date from keyword_ranking_history
 */
export interface HistoricalKeyword {
  id: string;
  keyword: string;
  ranking_position: number | null;
  found_url: string | null;
  competitor_rankings: Record<string, any> | null;
  // For historical data, we don't have first/best/previous from history
  first_position: null;
  best_position: null;
  previous_position: null;
  last_checked_at: string;
  class_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  serp_results: any | null;
}

export function useHistoricalKeywords(
  classId: string | undefined,
  selectedDate: string | undefined, // format: yyyy-MM-dd
  page: number,
  pageSize: number,
  search?: string
) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["historical-keywords", classId, selectedDate, page, pageSize, search, user?.id],
    queryFn: async () => {
      if (!user || !classId || !selectedDate) {
        return { keywords: [], totalCount: 0 };
      }

      // 1. Fetch history records FIRST with timezone-aware range (includes ±12h buffer)
      const { start: startOfDay, end: endOfDay } = getDateRangeForQuery(selectedDate);

      // Get all keyword IDs for this class first
      const { data: allKeywords, error: allKeywordsError } = await supabase
        .from("project_keywords")
        .select("id")
        .eq("class_id", classId);

      if (allKeywordsError) throw allKeywordsError;
      if (!allKeywords || allKeywords.length === 0) {
        return { keywords: [], totalCount: 0 };
      }

      const allKeywordIds = allKeywords.map((k) => k.id);

      const { data: history, error: historyError } = await supabase
        .from("keyword_ranking_history")
        .select("*")
        .in("keyword_id", allKeywordIds)
        .gte("checked_at", startOfDay)
        .lte("checked_at", endOfDay)
        .order("checked_at", { ascending: false });

      if (historyError) throw historyError;

      // 2. Filter to exact date (Vietnam timezone) and group by keyword_id (take latest)
      const latestByKeyword = new Map<string, any>();
      (history || [])
        .filter((record) => utcToVnDateString(record.checked_at) === selectedDate)
        .forEach((record) => {
          if (!latestByKeyword.has(record.keyword_id)) {
            latestByKeyword.set(record.keyword_id, record);
          }
        });

      // 3. If no history records → return empty (no fallback!)
      if (latestByKeyword.size === 0) {
        return { keywords: [], totalCount: 0 };
      }

      // 4. Fetch keyword base info ONLY for keywords that have history
      const keywordIdsWithHistory = Array.from(latestByKeyword.keys());

      const { data: keywords, error: keywordsError } = await supabase
        .from("project_keywords")
        .select("id, keyword, class_id, user_id, created_at, updated_at, serp_results")
        .in("id", keywordIdsWithHistory);

      if (keywordsError) throw keywordsError;
      if (!keywords || keywords.length === 0) {
        return { keywords: [], totalCount: 0 };
      }

      // 5. Apply search filter if provided
      let filteredKeywords = keywords;
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        filteredKeywords = keywords.filter((k) => 
          k.keyword.toLowerCase().includes(searchLower)
        );
      }

      // 6. Build result - ONLY keywords with history (no fallback)
      const mergedKeywords: HistoricalKeyword[] = filteredKeywords
        .filter((kw) => latestByKeyword.has(kw.id)) // Double-check
        .map((kw) => {
          const historyRecord = latestByKeyword.get(kw.id)!;
          return {
            id: kw.id,
            keyword: kw.keyword,
            ranking_position: historyRecord.ranking_position,
            found_url: historyRecord.found_url,
            competitor_rankings: historyRecord.competitor_rankings,
            first_position: null,
            best_position: null,
            previous_position: null,
            last_checked_at: historyRecord.checked_at, // Always from history, no fallback!
            class_id: kw.class_id,
            user_id: kw.user_id,
            created_at: kw.created_at,
            updated_at: kw.updated_at,
            serp_results: kw.serp_results,
          };
        });

      // 7. Apply pagination
      const totalCount = mergedKeywords.length;
      const from = page * pageSize;
      const paginatedKeywords = mergedKeywords.slice(from, from + pageSize);

      return {
        keywords: paginatedKeywords,
        totalCount,
      };
    },
    enabled: !!user && !!classId && !!selectedDate,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetches and calculates ranking stats for a specific historical date
 */
export interface HistoricalRankingStats {
  top3: number;
  top10: number;
  top30: number;
  top100: number;
  notFound: number;
  total: number;
}

export function useHistoricalStats(
  classId: string | undefined,
  selectedDate: string | undefined // format: yyyy-MM-dd
) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["historical-stats", classId, selectedDate, user?.id],
    queryFn: async (): Promise<HistoricalRankingStats> => {
      if (!user || !classId || !selectedDate) {
        return { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 };
      }

      // Get keyword IDs for this class
      const { data: keywords, error: keywordsError } = await supabase
        .from("project_keywords")
        .select("id")
        .eq("class_id", classId);

      if (keywordsError) throw keywordsError;
      if (!keywords || keywords.length === 0) {
        return { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 };
      }

      const keywordIds = keywords.map((k) => k.id);
      const { start, end } = getDateRangeForQuery(selectedDate);

      // Fetch history with buffer
      const { data: history, error: historyError } = await supabase
        .from("keyword_ranking_history")
        .select("keyword_id, ranking_position, checked_at")
        .in("keyword_id", keywordIds)
        .gte("checked_at", start)
        .lte("checked_at", end);

      if (historyError) throw historyError;

      // Filter to exact date and group by keyword (latest record per keyword)
      const latestByKeyword = new Map<string, number | null>();
      
      (history || [])
        .filter((r) => utcToVnDateString(r.checked_at) === selectedDate)
        .sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime())
        .forEach((record) => {
          if (!latestByKeyword.has(record.keyword_id)) {
            latestByKeyword.set(record.keyword_id, record.ranking_position);
          }
        });

      // Calculate stats
      let top3 = 0, top10 = 0, top30 = 0, top100 = 0, notFound = 0;
      
      latestByKeyword.forEach((position) => {
        if (position === null || position > 100) {
          notFound++;
        } else if (position <= 3) {
          top3++;
        } else if (position <= 10) {
          top10++;
        } else if (position <= 30) {
          top30++;
        } else {
          top100++;
        }
      });

      return {
        top3,
        top10,
        top30,
        top100,
        notFound,
        total: latestByKeyword.size,
      };
    },
    enabled: !!user && !!classId && !!selectedDate,
    staleTime: 60 * 1000,
  });
}
