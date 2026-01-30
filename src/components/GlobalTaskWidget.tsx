import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTaskProgress } from "@/contexts/TaskProgressContext";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function GlobalTaskWidget() {
  const { tasks, removeTask } = useTaskProgress();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [refreshedClassIds, setRefreshedClassIds] = useState<Set<string>>(new Set());

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

  // Auto-refresh data when task completes on current page
  useEffect(() => {
    tasks.forEach((task) => {
      if (task.status === "completed" && !refreshedClassIds.has(task.classId)) {
        const isOnClassPage = location.pathname.includes(`/classes/${task.classId}`);
        
        if (isOnClassPage) {
          // Invalidate all relevant queries
          queryClient.invalidateQueries({ 
            queryKey: ["keywords-paginated", task.classId] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ["class-ranking-stats", task.classId] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ["class-metadata", task.classId] 
          });
          
          setRefreshedClassIds((prev) => new Set(prev).add(task.classId));
        }
      }
    });
  }, [tasks, location.pathname, queryClient, refreshedClassIds]);

  // Clear refreshed IDs when tasks are removed
  useEffect(() => {
    const activeIds = new Set(tasks.map(t => t.classId));
    setRefreshedClassIds((prev) => {
      const newSet = new Set<string>();
      prev.forEach(id => {
        if (activeIds.has(id)) newSet.add(id);
      });
      return newSet;
    });
  }, [tasks]);

  // Show both active and recently completed tasks
  const visibleTasks = [...activeTasks, ...completedTasks];

  // Don't render if no tasks
  if (visibleTasks.length === 0) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-40",
        "animate-in slide-in-from-bottom-5 fade-in duration-300"
      )}
    >
      <Card className={cn(
        "w-80 max-w-[400px]",
        "bg-background border border-border",
        "shadow-xl rounded-xl"
      )}>
        <CardHeader className="py-3 px-4 pb-0">
          <CardTitle className="text-sm font-medium text-foreground">
            Active Tasks ({visibleTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-2">
          <ScrollArea className="max-h-64">
            <div className="space-y-1 pr-2">
              {visibleTasks.map((task) => {
                const progressPercent = task.total > 0 
                  ? Math.round((task.progress / task.total) * 100) 
                  : 0;

                const isCompleted = task.status === "completed";
                const isFailed = task.status === "failed";
                const wasRefreshed = refreshedClassIds.has(task.classId);

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
                      <span className={cn(
                        isCompleted && wasRefreshed && "text-green-600 font-medium"
                      )}>
                        {task.status === "pending" 
                          ? "Waiting..." 
                          : isCompleted
                          ? wasRefreshed
                            ? "✓ Data updated"
                            : "Completed"
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
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
