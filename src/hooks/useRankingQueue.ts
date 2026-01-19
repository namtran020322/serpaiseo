import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTaskProgress } from "@/contexts/TaskProgressContext";
import { toast } from "sonner";

interface AddJobParams {
  classId: string;
  className: string;
  keywordIds?: string[];
}

export function useAddRankingJob() {
  const { addTask, updateTask, removeTask } = useTaskProgress();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, className, keywordIds }: AddJobParams) => {
      // Create temp ID for immediate display (optimistic UI)
      const tempId = `temp-${classId}-${Date.now()}`;

      // Show progress IMMEDIATELY
      addTask({
        id: tempId,
        classId,
        className,
        progress: 0,
        total: keywordIds?.length || 0,
        status: "pending",
      });

      try {
        const { data, error } = await supabase.functions.invoke("add-ranking-job", {
          body: { classId, keywordIds },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Failed to add job");

        // Update task with real ID and total (preserves startedAt)
        updateTask(tempId, {
          id: data.job_id,
          total: data.total_keywords,
        });

        return data;
      } catch (err) {
        // Remove temp task on error
        removeTask(tempId);
        throw err;
      }
    },
    onSuccess: (data, variables) => {
      toast.success("Ranking check started", {
        description: `Checking ${data.total_keywords} keywords for ${variables.className}`,
      });

      // Trigger queue processing immediately (don't wait for cron)
      supabase.functions.invoke("process-ranking-queue").catch(console.error);
    },
    onError: (error: any) => {
      // Handle 409 conflict (job already exists)
      if (error.message?.includes("already in progress")) {
        toast.info("Check already in progress", {
          description: "A ranking check is already running for this class",
        });
        return;
      }

      toast.error("Failed to start ranking check", {
        description: error.message || "Please try again",
      });
    },
  });
}

// Hook to trigger queue processing (called periodically or after adding job)
export function useTriggerQueueProcessing() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("process-ranking-queue");
      if (error) throw error;
      return data;
    },
  });
}
