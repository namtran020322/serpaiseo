import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
  ExpandedState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ChevronDown, Monitor, Smartphone, Tablet, Calendar, Globe } from "lucide-react";
import { ProjectWithClasses, useDeleteProject } from "@/hooks/useProjects";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface ProjectsTableProps {
  projects: ProjectWithClasses[];
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
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const deleteProject = useDeleteProject();

  const columns = useMemo<ColumnDef<ProjectWithClasses>[]>(() => [
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
      id: "expand",
      header: "",
      cell: ({ row }) => {
        const hasClasses = row.original.classes.length > 0;
        if (!hasClasses) return null;
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              row.toggleExpanded();
            }}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link 
          to={`/dashboard/projects/${row.original.id}`}
          className="font-medium hover:underline"
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
        <Badge variant="outline">{row.original.classes.length}</Badge>
      ),
    },
    {
      id: "keywords",
      header: ({ column }) => <DataTableColumnHeader column={column} title="KWs" />,
      accessorFn: (row) => row.classes.reduce((acc, cls) => acc + cls.keywordCount, 0),
      cell: ({ row }) => {
        const total = row.original.classes.reduce((acc, cls) => acc + cls.keywordCount, 0);
        return <span className="font-medium">{total}</span>;
      },
    },
    {
      id: "top3",
      header: "1-3",
      cell: ({ row }) => {
        const total = row.original.classes.reduce((acc, cls) => acc + cls.rankingStats.top3, 0);
        return <span className="text-emerald-600 font-medium">{total}</span>;
      },
    },
    {
      id: "top10",
      header: "4-10",
      cell: ({ row }) => {
        const total = row.original.classes.reduce((acc, cls) => acc + cls.rankingStats.top10, 0);
        return <span className="text-blue-600 font-medium">{total}</span>;
      },
    },
    {
      id: "top30",
      header: "11-30",
      cell: ({ row }) => {
        const total = row.original.classes.reduce((acc, cls) => acc + cls.rankingStats.top30, 0);
        return <span className="text-amber-600 font-medium">{total}</span>;
      },
    },
    {
      id: "top100",
      header: "31-100",
      cell: ({ row }) => {
        const total = row.original.classes.reduce((acc, cls) => acc + cls.rankingStats.top100, 0);
        return <span className="text-orange-600 font-medium">{total}</span>;
      },
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDistanceToNow(new Date(row.original.updated_at), { addSuffix: true })}
        </span>
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
      expanded,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => row.original.classes.length > 0,
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
                        ? "w-10" 
                        : header.id === "top3" || header.id === "top10" || header.id === "top30" || header.id === "top100"
                        ? "w-16 text-center"
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
                <>
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id}
                        className={
                          cell.column.id === "top3" || cell.column.id === "top10" || cell.column.id === "top30" || cell.column.id === "top100"
                            ? "text-center"
                            : ""
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {/* Expanded Classes */}
                  {row.getIsExpanded() && row.original.classes.length > 0 && (
                    row.original.classes.map((cls) => {
                      const DeviceIcon = deviceIcons[cls.device as keyof typeof deviceIcons] || Monitor;
                      return (
                        <TableRow key={cls.id} className="bg-muted/30 hover:bg-muted/50">
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <Link 
                              to={`/dashboard/projects/${row.original.id}/classes/${cls.id}`}
                              className="flex items-center gap-2 pl-4 hover:underline"
                            >
                              <span className="text-muted-foreground">└</span>
                              <span className="font-medium">{cls.name}</span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <DomainWithFavicon domain={cls.domain} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {cls.country_name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{cls.keywordCount}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-emerald-600 font-medium">{cls.rankingStats.top3}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-blue-600 font-medium">{cls.rankingStats.top10}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-amber-600 font-medium">{cls.rankingStats.top30}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-orange-600 font-medium">{cls.rankingStats.top100}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-sm">
                              {formatDistanceToNow(new Date(cls.last_checked_at || cls.updated_at), { addSuffix: true })}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </>
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
