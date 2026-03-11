import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface TopMover {
  keyword: string;
  className: string;
  classId: string;
  projectId: string;
  currentPosition: number | null;
  previousPosition: number | null;
  change: number;
}

export interface DashboardStats {
  totalProjects: number;
  totalKeywords: number;
  checksToday: number;
  topMovers: TopMover[];
  rankingDistribution: {
    top3: number;
    top10: number;
    top30: number;
    top100: number;
    notFound: number;
    total: number;
  };
}

export function useDashboardStats() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user) throw new Error("Not authenticated");

      // Parallel queries
      const [projectsRes, keywordsRes, dailyRes] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("project_keywords").select("id, ranking_position, previous_position, keyword, class_id").eq("user_id", user.id),
        supabase.from("daily_usage_summary").select("total_keywords, check_count").eq("user_id", user.id).eq("usage_date", new Date().toISOString().split("T")[0]),
      ]);

      const totalProjects = projectsRes.count || 0;
      const keywords = keywordsRes.data || [];
      const totalKeywords = keywords.length;

      const dailyRow = dailyRes.data?.[0];
      const checksToday = dailyRow?.check_count || 0;

      // Ranking distribution
      let top3 = 0, top10 = 0, top30 = 0, top100 = 0, notFound = 0;
      keywords.forEach((kw) => {
        const pos = kw.ranking_position;
        if (pos == null || pos > 100) notFound++;
        else if (pos <= 3) top3++;
        else if (pos <= 10) top10++;
        else if (pos <= 30) top30++;
        else top100++;
      });

      // Top movers - keywords with biggest position change
      const movers: TopMover[] = [];
      const classIds = [...new Set(keywords.filter(k => k.class_id).map(k => k.class_id))];
      
      // Fetch class metadata for names
      let classMap: Record<string, { name: string; project_id: string }> = {};
      if (classIds.length > 0) {
        const { data: classes } = await supabase
          .from("project_classes")
          .select("id, name, project_id")
          .in("id", classIds);
        if (classes) {
          classes.forEach(c => { classMap[c.id] = { name: c.name, project_id: c.project_id }; });
        }
      }

      keywords.forEach((kw) => {
        if (kw.ranking_position != null && kw.previous_position != null) {
          const change = kw.previous_position - kw.ranking_position;
          if (change !== 0) {
            const cls = classMap[kw.class_id] || { name: "", project_id: "" };
            movers.push({
              keyword: kw.keyword,
              className: cls.name,
              classId: kw.class_id,
              projectId: cls.project_id,
              currentPosition: kw.ranking_position,
              previousPosition: kw.previous_position,
              change,
            });
          }
        }
      });

      // Sort by absolute change descending, take top 10
      movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
      const topMovers = movers.slice(0, 10);

      return {
        totalProjects,
        totalKeywords,
        checksToday,
        topMovers,
        rankingDistribution: { top3, top10, top30, top100, notFound, total: totalKeywords },
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
