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
import { Checkbox } from "@/components/ui/checkbox";
import { useDeleteProject } from "@/hooks/useProjects";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { PaginatedProject } from "@/hooks/useProjectsPaginated";
import { cn } from "@/lib/utils";
import { ConfirmDeleteDialog } from "@/components/projects/ConfirmDeleteDialog";

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

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const deleteProject = useDeleteProject();
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" className="justify-start" />,
      size: Number.MAX_SAFE_INTEGER,
      cell: ({ row }) => (
        <Link
          to={`/dashboard/projects/${row.original.id}`}
          className="font-medium hover:underline block w-full truncate text-left"
          title={row.getValue("name") as string}
        >
          {row.getValue("name")}
        </Link>
      ),
    },
    {
      accessorKey: "domain",
      header: () => (
        <div className="flex justify-end">
          <span className="w-[220px] text-left">Domain</span>
        </div>
      ),
      size: 220,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <div className="w-[220px] flex justify-start">
            <DomainWithFavicon domain={row.original.domain} showFullDomain />
          </div>
        </div>
      ),
    },
    {
      id: "classes",
      header: () => (
        <div className="flex justify-end">
          <span className="w-16 text-left">Classes</span>
        </div>
      ),
      size: 64,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <div className="w-16 text-left">
            <Badge variant="outline">{row.original.class_count}</Badge>
          </div>
        </div>
      ),
    },
    {
      id: "keywords",
      header: () => (
        <div className="flex justify-end">
          <span className="w-16 text-left">Keywords</span>
        </div>
      ),
      accessorFn: (row) => row.keyword_count,
      size: 64,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <span className="w-16 font-medium text-left">{row.original.keyword_count}</span>
        </div>
      ),
    },
    {
      id: "top3",
      header: () => (
        <div className="flex justify-end">
          <span className="w-14 whitespace-nowrap text-left">1-3</span>
        </div>
      ),
      size: 56,
      cell: ({ row }) => {
        const count = row.original.top3_count || 0;
        const change = row.original.top3_change || 0;
        return (
          <div className="flex justify-end">
            <div className="w-14 flex items-center gap-1 text-left">
              <span className="text-emerald-600 font-medium">{count}</span>
              {change !== 0 && (
                <span className={cn("text-xs font-medium", change > 0 ? "text-emerald-500" : "text-destructive")}>
                  {change > 0 ? `↗${change}` : `↘${Math.abs(change)}`}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "top10",
      header: () => (
        <div className="flex justify-end">
          <span className="w-14 whitespace-nowrap text-left">4-10</span>
        </div>
      ),
      size: 56,
      cell: ({ row }) => {
        const count = row.original.top10_count || 0;
        const change = row.original.top10_change || 0;
        return (
          <div className="flex justify-end">
            <div className="w-14 flex items-center gap-1 text-left">
              <span className="text-blue-600 font-medium">{count}</span>
              {change !== 0 && (
                <span className={cn("text-xs font-medium", change > 0 ? "text-emerald-500" : "text-destructive")}>
                  {change > 0 ? `↗${change}` : `↘${Math.abs(change)}`}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "top30",
      header: () => (
        <div className="flex justify-end">
          <span className="w-14 whitespace-nowrap text-left">11-30</span>
        </div>
      ),
      size: 56,
      cell: ({ row }) => {
        const count = row.original.top30_count || 0;
        const change = row.original.top30_change || 0;
        return (
          <div className="flex justify-end">
            <div className="w-14 flex items-center gap-1 text-left">
              <span className="text-amber-600 font-medium">{count}</span>
              {change !== 0 && (
                <span className={cn("text-xs font-medium", change > 0 ? "text-emerald-500" : "text-destructive")}>
                  {change > 0 ? `↗${change}` : `↘${Math.abs(change)}`}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "updated_at",
      header: () => (
        <div className="flex justify-end">
          <span className="w-24 text-left">Updated</span>
        </div>
      ),
      size: 96,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <span className="w-24 text-muted-foreground text-sm text-left">
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

  // Handler to open delete confirmation dialog
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      for (const id of selectedIds) {
        await deleteProject.mutateAsync(id);
      }
      setRowSelection({});
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchKey="name"
        searchPlaceholder="Filter projects..."
        selectedCount={selectedIds.length}
        onDeleteSelected={handleDeleteClick}
      />
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Projects"
        description="Are you sure you want to delete the selected projects? This will also delete all classes, keywords, and ranking history associated with them. This action cannot be undone."
        itemCount={selectedIds.length}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnSize = header.column.columnDef.size;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "whitespace-nowrap text-left",
                        header.id === "select" ? "w-10 hidden sm:table-cell" : "",
                        header.id === "classes" || header.id === "keywords" ? "hidden md:table-cell" : "",
                        (header.id === "top3" || header.id === "top10" || header.id === "top30") ? "hidden lg:table-cell" : "",
                        header.id === "updated_at" ? "hidden lg:table-cell" : ""
                      )}
                      style={columnSize ? { width: columnSize } : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => {
                    const columnSize = cell.column.columnDef.size;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "text-left",
                          cell.column.id === "select" ? "hidden sm:table-cell" : "",
                          cell.column.id === "classes" || cell.column.id === "keywords" ? "hidden md:table-cell" : "",
                          (cell.column.id === "top3" || cell.column.id === "top10" || cell.column.id === "top30") ? "hidden lg:table-cell" : "",
                          cell.column.id === "updated_at" ? "hidden lg:table-cell" : ""
                        )}
                        style={columnSize ? { width: columnSize } : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
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