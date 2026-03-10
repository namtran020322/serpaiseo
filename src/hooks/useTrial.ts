import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface TrialInfo {
  isOnTrial: boolean;
  isExpired: boolean;
  maxProjects: number;
  maxClassesPerProject: number;
  expiresAt: string | null;
  creditsGranted: number;
}

const DEFAULT_TRIAL: TrialInfo = {
  isOnTrial: false,
  isExpired: false,
  maxProjects: Infinity,
  maxClassesPerProject: Infinity,
  expiresAt: null,
  creditsGranted: 0,
};

export function useTrial() {
  const { user } = useAuthContext();

  const { data: trial, isLoading } = useQuery({
    queryKey: ["trial-credits", user?.id],
    queryFn: async (): Promise<TrialInfo> => {
      if (!user) return DEFAULT_TRIAL;

      // Use rpc or raw fetch since trial_credits is not in generated types yet
      const { data, error } = await supabase
        .from("trial_credits" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) return DEFAULT_TRIAL;

      const row = data as any;
      const isExpired = !row.is_active || new Date(row.expires_at) <= new Date();

      return {
        isOnTrial: row.is_active && !isExpired,
        isExpired,
        maxProjects: row.max_projects,
        maxClassesPerProject: row.max_classes_per_project,
        expiresAt: row.expires_at,
        creditsGranted: row.credits_granted,
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  return {
    trial: trial || DEFAULT_TRIAL,
    isLoading,
  };
}
