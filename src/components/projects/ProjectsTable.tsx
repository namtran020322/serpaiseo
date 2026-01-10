import { useState } from "react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProjectWithClasses } from "@/hooks/useProjects";
import { ProjectRow } from "./ProjectRow";

interface ProjectsTableProps {
  projects: ProjectWithClasses[];
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-24">Domain</TableHead>
            <TableHead className="w-24">Country</TableHead>
            <TableHead className="w-20">Device</TableHead>
            <TableHead className="w-16 text-center">KWs</TableHead>
            <TableHead className="w-16 text-center">1-3</TableHead>
            <TableHead className="w-16 text-center">4-10</TableHead>
            <TableHead className="w-16 text-center">11-30</TableHead>
            <TableHead className="w-20 text-center">31-100</TableHead>
            <TableHead className="w-28">Updated</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              isExpanded={expandedProjects.has(project.id)}
              onToggle={() => toggleProject(project.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
