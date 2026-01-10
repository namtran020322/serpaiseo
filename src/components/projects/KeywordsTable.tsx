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
import { ChevronRight, ChevronDown, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ProjectKeyword } from "@/hooks/useProjects";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";

interface KeywordsTableProps {
  keywords: ProjectKeyword[];
  competitorDomains: string[];
  onDeleteKeywords?: (ids: string[]) => void;
  onRefreshKeywords?: (ids: string[]) => void;
}

const getPositionColor = (position: number | null) => {
  if (position === null) return "text-muted-foreground";
  if (position <= 3) return "text-emerald-600";
  if (position <= 10) return "text-blue-600";
  if (position <= 30) return "text-amber-600";
  if (position <= 100) return "text-orange-600";
  return "text-destructive";
};

const getChangeIndicator = (current: number | null, previous: number | null) => {
  if (current === null || previous === null) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  const change = previous - current;
  if (change > 0) {
    return (
      <span className="flex items-center gap-1 text-emerald-600">
        <TrendingUp className="h-4 w-4" />
        +{change}
      </span>
    );
  } else if (change < 0) {
    return (
      <span className="flex items-center gap-1 text-destructive">
        <TrendingDown className="h-4 w-4" />
        {change}
      </span>
    );
  }
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const extractSlug = (url: string | null) => {
  if (!url) return "-";
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = parsed.pathname;
    return path.length > 30 ? path.substring(0, 30) + "..." : path || "/";
  } catch {
    return url.substring(0, 30);
  }
};

export function KeywordsTable({ 
  keywords, 
  competitorDomains,
  onDeleteKeywords,
  onRefreshKeywords,
}: KeywordsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns = useMemo<ColumnDef<ProjectKeyword>[]>(() => [
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
        const hasCompetitors = competitorDomains.length > 0;
        if (!hasCompetitors) return null;
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => row.toggleExpanded()}
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
      accessorKey: "keyword",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Keyword" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("keyword")}</span>,
    },
    {
      accessorKey: "ranking_position",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last" />,
      cell: ({ row }) => {
        const position = row.getValue("ranking_position") as number | null;
        return (
          <span className={`font-medium ${getPositionColor(position)}`}>
            {position ?? "-"}
          </span>
        );
      },
    },
    {
      accessorKey: "first_position",
      header: ({ column }) => <DataTableColumnHeader column={column} title="First" />,
      cell: ({ row }) => {
        const position = row.getValue("first_position") as number | null;
        return <span className="text-muted-foreground">{position ?? "-"}</span>;
      },
    },
    {
      accessorKey: "best_position",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Best" />,
      cell: ({ row }) => {
        const position = row.getValue("best_position") as number | null;
        return (
          <span className={`font-medium ${getPositionColor(position)}`}>
            {position ?? "-"}
          </span>
        );
      },
    },
    {
      id: "change",
      header: "Change",
      cell: ({ row }) => {
        const current = row.original.ranking_position;
        const previous = row.original.previous_position;
        return getChangeIndicator(current, previous);
      },
    },
    {
      accessorKey: "found_url",
      header: "URL",
      cell: ({ row }) => {
        const url = row.getValue("found_url") as string | null;
        return (
          <span className="text-sm text-muted-foreground" title={url || ""}>
            {extractSlug(url)}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const url = row.original.found_url;
        if (!url) return null;
        return (
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        );
      },
    },
  ], [competitorDomains.length]);

  const table = useReactTable({
    data: keywords,
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
    getRowCanExpand: () => competitorDomains.length > 0,
  });

  const selectedIds = Object.keys(rowSelection).map((index) => keywords[parseInt(index)]?.id).filter(Boolean);

  if (keywords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <p className="text-muted-foreground">No keywords added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchKey="keyword"
        searchPlaceholder="Filter keywords..."
        selectedCount={selectedIds.length}
        onDeleteSelected={onDeleteKeywords ? () => onDeleteKeywords(selectedIds) : undefined}
        onRefreshSelected={onRefreshKeywords ? () => onRefreshKeywords(selectedIds) : undefined}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={header.id === "select" || header.id === "expand" ? "w-10" : ""}>
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
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {/* Expanded Competitor Rankings Table */}
                  {row.getIsExpanded() && competitorDomains.length > 0 && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={columns.length} className="py-3">
                        <div className="pl-12">
                          <p className="text-sm font-medium mb-2 text-muted-foreground">Competitor Rankings</p>
                          <div className="rounded-md border bg-background">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-48">Domain</TableHead>
                                  <TableHead className="w-20 text-center">Last</TableHead>
                                  <TableHead className="w-20 text-center">First</TableHead>
                                  <TableHead className="w-20 text-center">Best</TableHead>
                                  <TableHead className="w-24 text-center">Change</TableHead>
                                  <TableHead>URL</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {competitorDomains.map((domain) => {
                                  const rankings = row.original.competitor_rankings as Record<string, any> | null;
                                  const data = rankings?.[domain];
                                  const position = typeof data === "object" ? data?.position : data;
                                  const firstPos = typeof data === "object" ? data?.first_position : null;
                                  const bestPos = typeof data === "object" ? data?.best_position : null;
                                  const prevPos = typeof data === "object" ? data?.previous_position : null;
                                  const url = typeof data === "object" ? data?.url : null;

                                  return (
                                    <TableRow key={domain}>
                                      <TableCell>
                                        <DomainWithFavicon domain={domain} showFullDomain />
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <span className={`font-medium ${getPositionColor(position ?? null)}`}>
                                          {position ?? "-"}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-center text-muted-foreground">
                                        {firstPos ?? "-"}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <span className={`font-medium ${getPositionColor(bestPos ?? null)}`}>
                                          {bestPos ?? "-"}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {getChangeIndicator(position ?? null, prevPos ?? null)}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm text-muted-foreground" title={url || ""}>
                                            {extractSlug(url)}
                                          </span>
                                          {url && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                                              <a href={url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3 w-3" />
                                              </a>
                                            </Button>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
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
