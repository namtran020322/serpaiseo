import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTaskProgress } from "@/contexts/TaskProgressContext";
import { cn } from "@/lib/utils";

export function ProcessingTasks() {
  const { tasks } = useTaskProgress();
  const navigate = useNavigate();

  // Only show pending/processing tasks
  const activeTasks = tasks.filter((t) => t.status === "pending" || t.status === "processing");

  if (activeTasks.length === 0) return null;

  return (
    <div className="px-3 pb-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        Processing
      </div>
      {activeTasks.map((task) => {
        const progressPercent = task.total > 0 ? Math.round((task.progress / task.total) * 100) : 0;

        return (
          <div
            key={task.id}
            onClick={() => navigate(`/dashboard/classes/${task.classId}`)}
            className={cn(
              "p-3 rounded-lg border bg-card cursor-pointer transition-colors",
              "hover:bg-accent/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {task.status === "processing" ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : task.status === "completed" ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : task.status === "failed" ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Loader2 className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium truncate flex-1">{task.className}</span>
            </div>

            <Progress value={progressPercent} className="h-1.5 mb-1" />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {task.status === "pending" ? "Waiting..." : `${task.progress}/${task.total} keywords`}
              </span>
              <span>{progressPercent}%</span>
            </div>

            {task.errorMessage && (
              <p className="text-xs text-destructive mt-1 truncate">{task.errorMessage}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
