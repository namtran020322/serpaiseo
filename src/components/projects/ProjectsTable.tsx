import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useDeleteProject } from "@/hooks/useProjects";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { PaginatedProject } from "@/hooks/useProjectsPaginated";

// Ultra-compact time format helper
function formatCompactTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays <= 7) return `${diffDays}d ago`;
  return format(date, "dd/MM/yyyy");
}

interface ProjectsTableProps {
  projects: PaginatedProject[];
}

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const deleteProject = useDeleteProject();

  const columns = useMemo<ColumnDef<PaginatedProject>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link
          to={`/dashboard/projects/${row.original.id}`}
          className="font-medium hover:underline block max-w-[200px] truncate"
          title={row.getValue("name") as string}
        >
          {row.getValue("name")}
        </Link>
      ),
    },
    {
      accessorKey: "domain",
      header: "Domain",
      cell: ({ row }) => <DomainWithFavicon domain={row.original.domain} showFullDomain />,
    },
    {
      id: "classes",
      header: "Classes",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.class_count}</Badge>
      ),
    },
    {
      id: "keywords",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Keywords" />,
      accessorFn: (row) => row.keyword_count,
      cell: ({ row }) => (
        <span className="font-medium">{row.original.keyword_count}</span>
      ),
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" className="justify-end" />,
      cell: ({ row }) => (
        <div className="text-right">
          <span className="text-muted-foreground text-sm">
            {formatCompactTime(new Date(row.original.updated_at))}
          </span>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: projects,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const selectedIds = Object.keys(rowSelection).map((index) => projects[parseInt(index)]?.id).filter(Boolean);

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      await deleteProject.mutateAsync(id);
    }
    setRowSelection({});
  };

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchKey="name"
        searchPlaceholder="Filter projects..."
        selectedCount={selectedIds.length}
        onDeleteSelected={handleDeleteSelected}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.id === "select" || header.id === "expand"
                        ? "w-10 hidden sm:table-cell"
                        : header.id === "name"
                          ? "min-w-[120px] max-w-[200px]"
                          : header.id === "classes" || header.id === "keywords"
                            ? "hidden md:table-cell"
                            : header.id === "updated_at"
                              ? "hidden lg:table-cell w-[100px]"
                              : ""
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "select"
                          ? "hidden sm:table-cell"
                          : cell.column.id === "classes" || cell.column.id === "keywords"
                            ? "hidden md:table-cell"
                            : cell.column.id === "updated_at"
                              ? "hidden lg:table-cell w-[100px]"
                              : ""
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No projects found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
