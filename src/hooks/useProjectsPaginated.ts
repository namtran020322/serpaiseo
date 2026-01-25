import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface PaginatedProject {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  updated_at: string;
  class_count: number;
  keyword_count: number;
  top3_count: number;
  top10_count: number;
  top30_count: number;
}

interface ProjectsPaginatedResult {
  total: number;
  projects: PaginatedProject[];
}

export interface UseProjectsPaginatedParams {
  page: number;
  pageSize: number;
  search?: string;
}

export function useProjectsPaginated(params: UseProjectsPaginatedParams) {
  const { user } = useAuthContext();
  const { page, pageSize, search } = params;

  return useQuery({
    queryKey: ["projects-paginated", user?.id, page, pageSize, search],
    queryFn: async (): Promise<ProjectsPaginatedResult> => {
      if (!user) return { projects: [], total: 0 };

      const { data, error } = await supabase.rpc("get_projects_paginated", {
        p_user_id: user.id,
        p_offset: page * pageSize,
        p_limit: pageSize,
        p_search: search?.trim() || null,
      });

      if (error) throw error;

      // The RPC returns jsonb with 'total' and 'projects'
      const result = data as unknown as { total: number; projects: PaginatedProject[] } | null;
      
      return {
        projects: result?.projects || [],
        total: result?.total || 0,
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
    placeholderData: (previousData) => previousData,
  });
}
