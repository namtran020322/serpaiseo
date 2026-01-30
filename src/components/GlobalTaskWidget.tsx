import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTaskProgress } from "@/contexts/TaskProgressContext";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export function GlobalTaskWidget() {
  const { tasks, removeTask } = useTaskProgress();
  const navigate = useNavigate();

  // Filter active + recently completed tasks
  const activeTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "processing"
  );

  const completedTasks = tasks.filter(
    (t) => t.status === "completed" || t.status === "failed"
  );

  // Auto-hide completed tasks after 3 seconds
  useEffect(() => {
    completedTasks.forEach((task) => {
      const timer = setTimeout(() => removeTask(task.id), 3000);
      return () => clearTimeout(timer);
    });
  }, [completedTasks, removeTask]);

  // Show both active and recently completed tasks
  const visibleTasks = [...activeTasks, ...completedTasks];

  // Don't render if no tasks
  if (visibleTasks.length === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50",
      "animate-in slide-in-from-bottom-5 fade-in duration-300"
    )}>
      <Card className={cn(
        "w-80 max-w-[400px]",
        "bg-background border border-border",
        "shadow-xl rounded-xl"
      )}>
        <CardHeader className="py-3 px-4 pb-0">
          <CardTitle className="text-sm font-medium text-foreground">
            Active Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-2 space-y-1">
          {visibleTasks.map((task) => {
            const progressPercent = task.total > 0 
              ? Math.round((task.progress / task.total) * 100) 
              : 0;

            const isCompleted = task.status === "completed";
            const isFailed = task.status === "failed";

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/dashboard/projects/${task.classId.split("-")[0]}/classes/${task.classId}`)}
                className={cn(
                  "p-3 rounded-md cursor-pointer transition-colors",
                  "hover:bg-accent/50",
                  isCompleted && "bg-primary/10 hover:bg-primary/20",
                  isFailed && "bg-destructive/10 hover:bg-destructive/20"
                )}
              >
                {/* Row 1: Class name + Status icon */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium truncate flex-1 text-foreground">
                    {task.className}
                  </span>
                  {task.status === "processing" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : task.status === "completed" ? (
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  ) : isFailed ? (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <Loader2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Row 2: Progress bar */}
                <Progress 
                  value={progressPercent} 
                  className={cn(
                    "h-2 bg-secondary",
                    "[&>div]:transition-all [&>div]:duration-300",
                    isCompleted && "[&>div]:bg-primary",
                    isFailed && "[&>div]:bg-destructive"
                  )}
                />

                {/* Row 3: Details */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5">
                  <span>
                    {task.status === "pending" 
                      ? "Waiting..." 
                      : isCompleted
                      ? "Completed"
                      : isFailed
                      ? "Failed"
                      : `${task.progress}/${task.total} keywords`
                    }
                  </span>
                  <span>{progressPercent}%</span>
                </div>

                {/* Error message if any */}
                {task.errorMessage && (
                  <p className="text-xs text-destructive mt-1 truncate">
                    {task.errorMessage}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
