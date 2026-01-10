import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronDown, MoreHorizontal, Eye, RefreshCw, Plus, Pencil, Trash2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { ProjectWithClasses, useDeleteProject, useCheckRankings } from "@/hooks/useProjects";
import { ClassRow } from "./ClassRow";
import { formatDistanceToNow } from "date-fns";
import { AddClassDialog } from "./AddClassDialog";
import { EditProjectDialog } from "./EditProjectDialog";

interface ProjectRowProps {
  project: ProjectWithClasses;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ProjectRow({ project, isExpanded, onToggle }: ProjectRowProps) {
  const navigate = useNavigate();
  const deleteProject = useDeleteProject();
  const checkRankings = useCheckRankings();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addClassDialogOpen, setAddClassDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleRefreshAll = async () => {
    setIsChecking(true);
    try {
      await checkRankings.mutateAsync({ projectId: project.id });
    } finally {
      setIsChecking(false);
    }
  };

  // Aggregate stats from all classes
  const totalKeywords = project.classes.reduce((acc, cls) => acc + cls.keywordCount, 0);
  const aggregatedStats = project.classes.reduce(
    (acc, cls) => ({
      top3: acc.top3 + cls.rankingStats.top3,
      top10: acc.top10 + cls.rankingStats.top10,
      top30: acc.top30 + cls.rankingStats.top30,
      top100: acc.top100 + cls.rankingStats.top100,
      notFound: acc.notFound + cls.rankingStats.notFound,
    }),
    { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0 }
  );

  // Get most recent update
  const lastUpdated = project.classes.reduce((latest, cls) => {
    const clsDate = cls.last_checked_at || cls.updated_at;
    if (!latest) return clsDate;
    return new Date(clsDate) > new Date(latest) ? clsDate : latest;
  }, project.updated_at);

  const handleDelete = () => {
    deleteProject.mutate(project.id);
    setDeleteDialogOpen(false);
  };

  return (
    <Fragment>
      <TableRow className="bg-muted/30 hover:bg-muted/50">
        <TableCell>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggle}>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {project.name}
            <Badge variant="secondary" className="text-xs">
              {project.classes.length}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">-</TableCell>
        <TableCell className="text-muted-foreground">-</TableCell>
        <TableCell className="text-muted-foreground">-</TableCell>
        <TableCell className="text-center">
          <Badge variant="outline">{totalKeywords}</Badge>
        </TableCell>
        <TableCell className="text-center">
          <span className="text-emerald-600 font-medium">{aggregatedStats.top3}</span>
        </TableCell>
        <TableCell className="text-center">
          <span className="text-blue-600 font-medium">{aggregatedStats.top10}</span>
        </TableCell>
        <TableCell className="text-center">
          <span className="text-amber-600 font-medium">{aggregatedStats.top30}</span>
        </TableCell>
        <TableCell className="text-center">
          <span className="text-orange-600 font-medium">{aggregatedStats.top100}</span>
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
              <DropdownMenuItem onClick={() => navigate(`/dashboard/projects/${project.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddClassDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Class
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRefreshAll} disabled={isChecking}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Checking...' : 'Refresh All Classes'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {isExpanded &&
        project.classes.map((cls) => (
          <ClassRow key={cls.id} projectClass={cls} projectId={project.id} />
        ))}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This will also delete all classes
              and keywords associated with this project. This action cannot be undone.
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

      <AddClassDialog
        open={addClassDialogOpen}
        onOpenChange={setAddClassDialogOpen}
        projectId={project.id}
        projectName={project.name}
      />

      <EditProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
      />
    </Fragment>
  );
}
