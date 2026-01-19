import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "./AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface RunningTask {
  id: string;
  classId: string;
  className: string;
  progress: number;
  total: number;
  status: "pending" | "processing" | "completed" | "failed";
  startedAt: Date;
  errorMessage?: string;
}

interface TaskProgressContextType {
  tasks: RunningTask[];
  addTask: (task: Omit<RunningTask, "startedAt">) => void;
  removeTask: (id: string) => void;
  refreshTasks: () => Promise<void>;
}

const TaskProgressContext = createContext<TaskProgressContextType | undefined>(undefined);

export function TaskProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState<RunningTask[]>([]);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      return;
    }

    const { data, error } = await supabase
      .from("ranking_check_queue")
      .select(`
        id,
        class_id,
        status,
        total_keywords,
        processed_keywords,
        error_message,
        created_at,
        project_classes (name)
      `)
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch tasks:", error);
      return;
    }

    const newTasks: RunningTask[] = (data || []).map((item: any) => ({
      id: item.id,
      classId: item.class_id,
      className: item.project_classes?.name || "Unknown",
      progress: item.processed_keywords || 0,
      total: item.total_keywords || 0,
      status: item.status,
      startedAt: new Date(item.created_at),
      errorMessage: item.error_message,
    }));

    setTasks(newTasks);
  }, [user]);

  const addTask = useCallback((task: Omit<RunningTask, "startedAt">) => {
    setTasks((prev) => {
      // Avoid duplicates
      if (prev.find((t) => t.id === task.id)) return prev;
      return [...prev, { ...task, startedAt: new Date() }];
    });
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    fetchTasks();

    const channel: RealtimeChannel = supabase
      .channel("ranking-queue-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ranking_check_queue",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const eventType = payload.eventType;

          if (eventType === "DELETE") {
            removeTask(payload.old?.id);
            return;
          }

          if (!newData) return;

          if (newData.status === "completed" || newData.status === "failed") {
            // Remove completed/failed tasks after a short delay
            setTimeout(() => removeTask(newData.id), 3000);
          }

          // Update existing task or add new one
          setTasks((prev) => {
            const existingIdx = prev.findIndex((t) => t.id === newData.id);
            const updatedTask: RunningTask = {
              id: newData.id,
              classId: newData.class_id,
              className: prev[existingIdx]?.className || "Loading...",
              progress: newData.processed_keywords || 0,
              total: newData.total_keywords || 0,
              status: newData.status,
              startedAt: prev[existingIdx]?.startedAt || new Date(newData.created_at),
              errorMessage: newData.error_message,
            };

            if (existingIdx >= 0) {
              const updated = [...prev];
              updated[existingIdx] = updatedTask;
              return updated;
            } else if (newData.status === "pending" || newData.status === "processing") {
              return [...prev, updatedTask];
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTasks, removeTask]);

  return (
    <TaskProgressContext.Provider value={{ tasks, addTask, removeTask, refreshTasks: fetchTasks }}>
      {children}
    </TaskProgressContext.Provider>
  );
}

export function useTaskProgress() {
  const context = useContext(TaskProgressContext);
  if (!context) {
    throw new Error("useTaskProgress must be used within TaskProgressProvider");
  }
  return context;
}
