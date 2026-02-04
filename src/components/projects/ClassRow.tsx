import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CornerDownRight, MoreHorizontal, Eye, RefreshCw, Pencil, Trash2, Monitor, Smartphone, Tablet } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProjectClassWithKeywords, useDeleteClass, useCheckRankings } from "@/hooks/useProjects";
import { formatDistanceToNow } from "date-fns";
import { useTaskProgress } from "@/contexts/TaskProgressContext";

interface ClassRowProps {
  projectClass: ProjectClassWithKeywords;
  projectId: string;
}

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export function ClassRow({ projectClass, projectId }: ClassRowProps) {
  const navigate = useNavigate();
  const deleteClass = useDeleteClass();
  const checkRankings = useCheckRankings();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  // Check if class has running task (anti-spam refresh)
  const { tasks } = useTaskProgress();
  const isClassRunning = tasks.some(
    (t) => t.classId === projectClass.id && (t.status === "pending" || t.status === "processing")
  );

  const handleRefreshRankings = async () => {
    if (isClassRunning) return; // Prevent spam
    setIsChecking(true);
    try {
      await checkRankings.mutateAsync(projectClass.id);
    } finally {
      setIsChecking(false);
    }
  };

  const DeviceIcon = deviceIcons[projectClass.device as keyof typeof deviceIcons] || Monitor;

  const handleDelete = () => {
    deleteClass.mutate(projectClass.id);
    setDeleteDialogOpen(false);
  };

  const lastUpdated = projectClass.last_checked_at || projectClass.updated_at;

  return (
    <>
      <TableRow className="hover:bg-accent/50">
        <TableCell>
          <CornerDownRight className="h-4 w-4 text-muted-foreground ml-2" />
        </TableCell>
        <TableCell className="font-medium">{projectClass.name}</TableCell>
        <TableCell>
          <DomainWithFavicon domain={projectClass.domain} maxLength={15} />
        </TableCell>
        <TableCell>
          <span className="text-sm">{projectClass.country_name}</span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <DeviceIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm capitalize">{projectClass.device}</span>
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline">{projectClass.keywordCount}</Badge>
        </TableCell>
        <TableCell className="text-center">
          <span className="text-emerald-600 font-medium">{projectClass.rankingStats.top3}</span>
        </TableCell>
        <TableCell className="text-center">
          <span className="text-blue-600 font-medium">{projectClass.rankingStats.top10}</span>
        </TableCell>
        <TableCell className="text-center">
          <span className="text-amber-600 font-medium">{projectClass.rankingStats.top30}</span>
        </TableCell>
        <TableCell className="text-center">
          <span className="text-orange-600 font-medium">{projectClass.rankingStats.top100}</span>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  navigate(`/dashboard/projects/${projectId}/classes/${projectClass.id}`)
                }
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRefreshRankings} disabled={isChecking || isClassRunning}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isChecking || isClassRunning ? 'animate-spin' : ''}`} />
                {isClassRunning ? 'Checking...' : isChecking ? 'Starting...' : 'Refresh Rankings'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Class
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Class
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectClass.name}"? This will also delete all
              keywords and ranking history associated with this class. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
