import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { format } from "date-fns";

export function useRankingDates(classId: string | undefined) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["ranking-dates", classId, user?.id],
    queryFn: async () => {
      if (!classId || !user) return [];

      // Get keyword IDs for this class
      const { data: keywords, error: keywordsError } = await supabase
        .from("project_keywords")
        .select("id")
        .eq("class_id", classId);

      if (keywordsError) throw keywordsError;
      if (!keywords || keywords.length === 0) return [];

      const keywordIds = keywords.map((k) => k.id);

      // Get distinct dates from keyword_ranking_history
      const { data: history, error: historyError } = await supabase
        .from("keyword_ranking_history")
        .select("checked_at")
        .in("keyword_id", keywordIds)
        .order("checked_at", { ascending: false });

      if (historyError) throw historyError;
      if (!history) return [];

      // Extract unique dates (date only, no time)
      const uniqueDates = [
        ...new Set(history.map((h) => format(new Date(h.checked_at), "yyyy-MM-dd"))),
      ];

      return uniqueDates;
    },
    enabled: !!classId && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
