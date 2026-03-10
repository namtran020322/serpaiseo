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

export function useTrial() {
  const { user } = useAuthContext();

  const { data: trial, isLoading } = useQuery({
    queryKey: ["trial-credits", user?.id],
    queryFn: async (): Promise<TrialInfo> => {
      if (!user) return { isOnTrial: false, isExpired: false, maxProjects: Infinity, maxClassesPerProject: Infinity, expiresAt: null, creditsGranted: 0 };

      const { data, error } = await supabase
        .from("trial_credits" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        return { isOnTrial: false, isExpired: false, maxProjects: Infinity, maxClassesPerProject: Infinity, expiresAt: null, creditsGranted: 0 };
      }

      const isExpired = !data.is_active || new Date(data.expires_at) <= new Date();

      return {
        isOnTrial: data.is_active && !isExpired,
        isExpired,
        maxProjects: data.max_projects,
        maxClassesPerProject: data.max_classes_per_project,
        expiresAt: data.expires_at,
        creditsGranted: data.credits_granted,
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  return {
    trial: trial || { isOnTrial: false, isExpired: false, maxProjects: Infinity, maxClassesPerProject: Infinity, expiresAt: null, creditsGranted: 0 },
    isLoading,
  };
}
