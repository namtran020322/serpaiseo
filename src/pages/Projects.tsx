import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectsPaginated } from "@/hooks/useProjectsPaginated";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { AddProjectDialog } from "@/components/projects/AddProjectDialog";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Projects() {
  const { t } = useLanguage();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useProjectsPaginated({ page, pageSize, search });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("projects.title")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("projects.subtitle")}
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("projects.addProject")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("projects.loadingProjects")}</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <p className="text-destructive">{t("projects.errorLoading")}</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      ) : data && data.projects.length > 0 ? (
        <>
          <ProjectsTable projects={data.projects} onSearchChange={handleSearchChange} />
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <p className="text-sm text-muted-foreground">
                {t("projects.showing", { from: String(page * pageSize + 1), to: String(Math.min((page + 1) * pageSize, data.total)), total: String(data.total) })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  {t("previous")}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("projects.page", { current: String(page + 1), total: String(totalPages) })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <p className="text-muted-foreground">
            {t("projects.noProjects")}
          </p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("projects.addProject")}
          </Button>
        </div>
      )}

      <AddProjectDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
