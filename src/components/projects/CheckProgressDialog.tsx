import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface CheckProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  progress: {
    current: number;
    total: number;
    keyword: string;
    found?: number;
    notFound?: number;
  };
  onComplete?: () => void;
}

export function CheckProgressDialog({
  open,
  onOpenChange,
  className,
  progress,
  onComplete,
}: CheckProgressDialogProps) {
  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const isComplete = progress.current === progress.total && progress.total > 0;

  const handleClose = () => {
    if (isComplete) {
      onComplete?.();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            {isComplete ? "Check Complete" : "Checking Rankings"}
          </DialogTitle>
          <DialogDescription>Class: {className}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-3" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              {isComplete
                ? `Checked ${progress.total} keywords`
                : `Checking keyword ${progress.current} of ${progress.total}...`}
            </p>
            {!isComplete && progress.keyword && (
              <p className="text-sm font-medium truncate">"{progress.keyword}"</p>
            )}
          </div>

          {(progress.found !== undefined || progress.notFound !== undefined) && (
            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm">Found: {progress.found || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm">Not found: {progress.notFound || 0}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            {isComplete ? (
              <Button onClick={handleClose}>Done</Button>
            ) : (
              <Button variant="outline" onClick={handleClose}>
                Cancel Check
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
