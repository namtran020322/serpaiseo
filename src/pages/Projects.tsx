import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectsPaginated } from "@/hooks/useProjectsPaginated";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { AddProjectDialog } from "@/components/projects/AddProjectDialog";

export default function Projects() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, error } = useProjectsPaginated({ page, pageSize, search: "" });

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  return (
    <div className="flex flex-col gap-6">
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
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      ) : data && data.projects.length > 0 ? (
        <>
          <ProjectsTable projects={data.projects} />
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <p className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data.total)} of {data.total} projects
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <p className="text-muted-foreground">
            No projects yet
          </p>
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
