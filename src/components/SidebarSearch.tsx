import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FolderOpen, Layers, Home, Settings } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useProjects";

export function SidebarSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: projects } = useProjects();

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start text-muted-foreground bg-sidebar-accent/30 border-sidebar-border hover:bg-sidebar-accent/50"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search projects, classes, pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Pages">
            <CommandItem onSelect={() => handleSelect("/dashboard")}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </CommandItem>
            <CommandItem onSelect={() => handleSelect("/dashboard/projects")}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Projects
            </CommandItem>
            <CommandItem onSelect={() => handleSelect("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </CommandItem>
          </CommandGroup>

          {projects && projects.length > 0 && (
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => handleSelect(`/dashboard/projects/${project.id}`)}
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <span>{project.name}</span>
                  {project.domain && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {project.domain}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {projects && projects.some((p) => p.classes && p.classes.length > 0) && (
            <CommandGroup heading="Classes">
              {projects.flatMap((project) =>
                (project.classes || []).map((cls) => (
                  <CommandItem
                    key={cls.id}
                    onSelect={() =>
                      handleSelect(`/dashboard/projects/${project.id}/classes/${cls.id}`)
                    }
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    <span>{cls.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      in {project.name}
                    </span>
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
