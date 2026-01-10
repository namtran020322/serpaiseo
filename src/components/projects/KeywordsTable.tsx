import React, { useState, useMemo } from "react";
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
import { ChevronRight, ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ProjectKeyword } from "@/hooks/useProjects";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

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

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // If > 7 days, show date format dd/MM/yyyy
  if (diffDays > 7) {
    return format(date, "dd/MM/yyyy");
  }
  
  // Short format: "3d ago", "11h ago", "4m ago", "14s ago"
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 0) return `${diffMinutes}m ago`;
  return `${diffSeconds}s ago`;
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
  const [showSerpTitles, setShowSerpTitles] = useState(false);

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
      enableHiding: false, // Keyword column cannot be hidden
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
      accessorKey: "last_checked_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      cell: ({ row }) => {
        const date = row.getValue("last_checked_at") as string | null;
        if (!date) return <span className="text-muted-foreground">-</span>;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm text-muted-foreground cursor-default">
                {formatRelativeTime(date)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {format(new Date(date), "HH:mm dd/MM/yyyy")}
            </TooltipContent>
          </Tooltip>
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
        showSerpTitles={showSerpTitles}
        onToggleSerpTitles={() => setShowSerpTitles(!showSerpTitles)}
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
              table.getRowModel().rows.map((row) => {
                const rankings = row.original.competitor_rankings as Record<string, any> | null;
                const lastChecked = row.original.last_checked_at;
                const visibleColumnIds = table.getVisibleLeafColumns().map(c => c.id);
                
                // serp_results is an array - find title matching ranking position
                const serpResultsArray = row.original.serp_results as Array<{ 
                  position: number; 
                  title?: string; 
                  url?: string 
                }> | null;
                const rankingPosition = row.original.ranking_position;
                const matchingResult = serpResultsArray?.find(r => r.position === rankingPosition);
                const serpTitle = matchingResult?.title;
                
                return (
                  <React.Fragment key={row.id}>
                    <TableRow data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    {/* SERP Title row - only show when toggle is ON */}
                    {showSerpTitles && serpTitle && (
                      <TableRow className="bg-muted/30 border-0 hover:bg-muted/40">
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell colSpan={visibleColumnIds.length - 2}>
                          <div className="text-sm text-primary truncate font-medium">
                            {serpTitle}
                          </div>
                          {row.original.found_url && (
                            <div className="text-xs text-muted-foreground truncate">
                              {row.original.found_url}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {/* Expanded Competitor Rankings - rendered as rows in same table */}
                    {row.getIsExpanded() && competitorDomains.length > 0 && 
                      competitorDomains.map((domain) => {
                        const data = rankings?.[domain];
                        const position = typeof data === "object" ? data?.position : data;
                        const firstPos = typeof data === "object" ? data?.first_position : null;
                        const bestPos = typeof data === "object" ? data?.best_position : null;
                        const prevPos = typeof data === "object" ? data?.previous_position : null;
                        const url = typeof data === "object" ? data?.url : null;

                        return (
                          <TableRow 
                            key={`${row.id}-competitor-${domain}`} 
                            className="bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary"
                          >
                            {/* Checkbox cell - always visible */}
                            <TableCell></TableCell>
                            
                            {/* Expand cell - always visible */}
                            <TableCell></TableCell>
                            
                            {/* Domain (aligned with Keyword column) - always visible */}
                            <TableCell>
                              <DomainWithFavicon domain={domain} showFullDomain size="sm" />
                            </TableCell>
                            
                            {/* Last - conditionally visible */}
                            {visibleColumnIds.includes("ranking_position") && (
                              <TableCell>
                                <span className={`font-medium ${getPositionColor(position ?? null)}`}>
                                  {position ?? "-"}
                                </span>
                              </TableCell>
                            )}
                            
                            {/* First - conditionally visible */}
                            {visibleColumnIds.includes("first_position") && (
                              <TableCell className="text-muted-foreground">
                                {firstPos ?? "-"}
                              </TableCell>
                            )}
                            
                            {/* Best - conditionally visible */}
                            {visibleColumnIds.includes("best_position") && (
                              <TableCell>
                                <span className={`font-medium ${getPositionColor(bestPos ?? null)}`}>
                                  {bestPos ?? "-"}
                                </span>
                              </TableCell>
                            )}
                            
                            {/* Change - conditionally visible */}
                            {visibleColumnIds.includes("change") && (
                              <TableCell>
                                {getChangeIndicator(position ?? null, prevPos ?? null)}
                              </TableCell>
                            )}
                            
                            {/* URL - conditionally visible */}
                            {visibleColumnIds.includes("found_url") && (
                              <TableCell>
                                <span className="text-sm text-muted-foreground truncate" title={url || ""}>
                                  {extractSlug(url)}
                                </span>
                              </TableCell>
                            )}
                            
                            {/* Updated - conditionally visible */}
                            {visibleColumnIds.includes("last_checked_at") && (
                              <TableCell>
                                {lastChecked ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-sm text-muted-foreground cursor-default">
                                        {formatRelativeTime(lastChecked)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {format(new Date(lastChecked), "HH:mm dd/MM/yyyy")}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : "-"}
                              </TableCell>
                            )}
                            
                          </TableRow>
                        );
                      })
                    }
                  </React.Fragment>
                );
              })
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
