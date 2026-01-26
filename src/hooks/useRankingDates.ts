import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";

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

      // Extract unique dates (yyyy-MM-dd format)
      const uniqueDates = new Set<string>();
      history.forEach((record) => {
        const date = format(parseISO(record.checked_at), "yyyy-MM-dd");
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

      // Get keyword IDs and base info for this class
      const { data: keywords, error: keywordsError } = await supabase
        .from("project_keywords")
        .select("id, keyword, class_id, user_id, created_at, updated_at, serp_results")
        .eq("class_id", classId);

      if (keywordsError) throw keywordsError;
      if (!keywords || keywords.length === 0) {
        return { keywords: [], totalCount: 0 };
      }

      // Apply search filter if provided
      let filteredKeywords = keywords;
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        filteredKeywords = keywords.filter((k) => 
          k.keyword.toLowerCase().includes(searchLower)
        );
      }

      const keywordIds = filteredKeywords.map((k) => k.id);
      if (keywordIds.length === 0) {
        return { keywords: [], totalCount: 0 };
      }

      // Get ranking history for selected date
      // Date range: start of day to end of day
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      const { data: history, error: historyError } = await supabase
        .from("keyword_ranking_history")
        .select("*")
        .in("keyword_id", keywordIds)
        .gte("checked_at", startOfDay)
        .lte("checked_at", endOfDay)
        .order("checked_at", { ascending: false });

      if (historyError) throw historyError;

      // Group by keyword_id and take the latest record for each
      const latestByKeyword = new Map<string, any>();
      (history || []).forEach((record) => {
        if (!latestByKeyword.has(record.keyword_id)) {
          latestByKeyword.set(record.keyword_id, record);
        }
      });

      // Merge with keyword base info
      const mergedKeywords: HistoricalKeyword[] = filteredKeywords.map((kw) => {
        const historyRecord = latestByKeyword.get(kw.id);
        return {
          id: kw.id,
          keyword: kw.keyword,
          ranking_position: historyRecord?.ranking_position ?? null,
          found_url: historyRecord?.found_url ?? null,
          competitor_rankings: historyRecord?.competitor_rankings ?? null,
          first_position: null,
          best_position: null,
          previous_position: null,
          last_checked_at: historyRecord?.checked_at ?? kw.updated_at,
          class_id: kw.class_id,
          user_id: kw.user_id,
          created_at: kw.created_at,
          updated_at: kw.updated_at,
          serp_results: kw.serp_results,
        };
      });

      // Apply pagination
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
