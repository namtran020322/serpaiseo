import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { ProjectKeyword, RankingStats } from "./useProjects";

export interface UseKeywordsPaginatedParams {
  classId: string;
  page: number; // 0-based
  pageSize: number;
  sortBy?: string;
  sortDesc?: boolean;
  search?: string;
}

export interface KeywordsPaginatedResult {
  keywords: ProjectKeyword[];
  totalCount: number;
}

export function useKeywordsPaginated(params: UseKeywordsPaginatedParams) {
  const { user } = useAuthContext();
  const { classId, page, pageSize, sortBy, sortDesc, search } = params;

  return useQuery({
    queryKey: ["keywords-paginated", classId, page, pageSize, sortBy, sortDesc, search, user?.id],
    queryFn: async (): Promise<KeywordsPaginatedResult> => {
      if (!user || !classId) {
        return { keywords: [], totalCount: 0 };
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("project_keywords")
        .select("*", { count: "exact" })
        .eq("class_id", classId);

      // Apply search filter
      if (search && search.trim()) {
        query = query.ilike("keyword", `%${search.trim()}%`);
      }

      // Apply sorting
      if (sortBy) {
        query = query.order(sortBy, { ascending: !sortDesc, nullsFirst: false });
      } else {
        query = query.order("created_at", { ascending: true });
      }

      // Apply pagination
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      const typedKeywords: ProjectKeyword[] = (data || []).map((k) => ({
        ...k,
        competitor_rankings: (k.competitor_rankings as Record<string, number | null>) || {},
      }));

      return {
        keywords: typedKeywords,
        totalCount: count || 0,
      };
    },
    enabled: !!user && !!classId,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

// Enhanced stats result type from RPC (includes improved/declined)
interface StatsResult {
  top3: number;
  top3_improved: number;
  top3_declined: number;
  top10: number;
  top10_improved: number;
  top10_declined: number;
  top30: number;
  top30_improved: number;
  top30_declined: number;
  top100: number;
  top100_improved: number;
  top100_declined: number;
  notFound: number;
  notFound_improved: number;
  notFound_declined: number;
  total: number;
}

export function useClassRankingStats(classId: string | undefined) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["class-ranking-stats", classId, user?.id],
    queryFn: async (): Promise<RankingStats> => {
      if (!user || !classId) {
        return { 
          top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0,
          top3_improved: 0, top3_declined: 0,
          top10_improved: 0, top10_declined: 0,
          top30_improved: 0, top30_declined: 0,
          top100_improved: 0, top100_declined: 0,
          notFound_improved: 0, notFound_declined: 0,
        };
      }

      const { data, error } = await supabase.rpc("get_class_ranking_stats", {
        p_class_id: classId,
      });

      if (error) throw error;

      // Cast the JSON result to our expected type
      const stats = data as unknown as StatsResult;

      return {
        top3: stats?.top3 || 0,
        top10: stats?.top10 || 0,
        top30: stats?.top30 || 0,
        top100: stats?.top100 || 0,
        notFound: stats?.notFound || 0,
        total: stats?.total || 0,
        // Enhanced stats
        top3_improved: stats?.top3_improved || 0,
        top3_declined: stats?.top3_declined || 0,
        top10_improved: stats?.top10_improved || 0,
        top10_declined: stats?.top10_declined || 0,
        top30_improved: stats?.top30_improved || 0,
        top30_declined: stats?.top30_declined || 0,
        top100_improved: stats?.top100_improved || 0,
        top100_declined: stats?.top100_declined || 0,
        notFound_improved: stats?.notFound_improved || 0,
        notFound_declined: stats?.notFound_declined || 0,
      };
    },
    enabled: !!user && !!classId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook to get class metadata without keywords
export function useClassMetadata(classId: string | undefined) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["class-metadata", classId, user?.id],
    queryFn: async () => {
      if (!user || !classId) return null;

      const { data, error } = await supabase
        .from("project_classes")
        .select("*")
        .eq("id", classId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        competitor_domains: (data.competitor_domains as string[]) || [],
      };
    },
    enabled: !!user && !!classId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
