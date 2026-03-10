import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FolderOpen, Layers, Home, Settings } from "lucide-react";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { useProjects } from "@/hooks/useProjects";
import { useLanguage } from "@/contexts/LanguageContext";

export function SidebarSearch() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: projects } = useProjects();

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); } };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (path: string) => { navigate(path); setOpen(false); };

  return (
    <>
      <button className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-muted-foreground bg-muted/40 rounded-xl border-0 hover:bg-muted/60 transition-colors cursor-pointer" onClick={() => setOpen(true)}>
        <Search className="h-3.5 w-3.5" /><span className="flex-1 text-left">{t("search.placeholder")}</span>
        <kbd className="pointer-events-none text-[10px] font-medium text-muted-foreground/60 bg-background/60 px-1.5 py-0.5 rounded-md">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("search.searchPlaceholder")} />
        <CommandList>
          <CommandEmpty>{t("search.noResults")}</CommandEmpty>
          <CommandGroup heading={t("search.pages")}>
            <CommandItem onSelect={() => handleSelect("/dashboard")}><Home className="mr-2 h-4 w-4" />{t("nav.home")}</CommandItem>
            <CommandItem onSelect={() => handleSelect("/dashboard/projects")}><FolderOpen className="mr-2 h-4 w-4" />{t("nav.projects")}</CommandItem>
            <CommandItem onSelect={() => handleSelect("/dashboard/settings")}><Settings className="mr-2 h-4 w-4" />{t("nav.settings")}</CommandItem>
          </CommandGroup>
          {projects && projects.length > 0 && (
            <CommandGroup heading={t("search.projects")}>
              {projects.map((project) => (
                <CommandItem key={project.id} onSelect={() => handleSelect(`/dashboard/projects/${project.id}`)}>
                  <FolderOpen className="mr-2 h-4 w-4" /><span>{project.name}</span>
                  {project.domain && <span className="ml-2 text-xs text-muted-foreground">{project.domain}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {projects && projects.some((p) => p.classes && p.classes.length > 0) && (
            <CommandGroup heading={t("search.classes")}>
              {projects.flatMap((project) =>
                (project.classes || []).map((cls) => (
                  <CommandItem key={cls.id} onSelect={() => handleSelect(`/dashboard/projects/${project.id}/classes/${cls.id}`)}>
                    <Layers className="mr-2 h-4 w-4" /><span>{cls.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{t("search.inProject", { name: project.name })}</span>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}