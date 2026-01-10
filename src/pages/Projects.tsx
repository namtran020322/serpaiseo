import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useProjects";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { AddProjectDialog } from "@/components/projects/AddProjectDialog";

export default function Projects() {
  const { data: projects, isLoading, error } = useProjects();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage your keyword tracking projects and classes
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <p className="text-destructive">Error loading projects</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      ) : projects && projects.length > 0 ? (
        <ProjectsTable projects={projects} />
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <p className="text-muted-foreground">No projects yet</p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>
      )}

      <AddProjectDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
