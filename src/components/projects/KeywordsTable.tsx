import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
  ExpandedState,
  PaginationState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Minus, Loader2 } from "lucide-react";
import { ProjectKeyword } from "@/hooks/useProjects";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SerpResultsDialog } from "@/components/projects/SerpResultsDialog";
import { format } from "date-fns";

interface KeywordsTableProps {
  keywords: ProjectKeyword[];
  competitorDomains: string[];
  userDomain?: string;
  onDeleteKeywords?: (ids: string[]) => void;
  onRefreshKeywords?: (ids: string[]) => void;
  // Server-side pagination props
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (sortBy: string | undefined, sortDesc: boolean) => void;
  onSearchChange?: (search: string) => void;
  isLoading?: boolean;
}

interface SerpResult {
  position: number;
  title?: string;
  description?: string;
  url?: string;
}

const getPositionColor = (position: number | null) => {
  if (position === null) return "text-muted-foreground";
  if (position <= 3) return "text-emerald-600";
  if (position <= 10) return "text-blue-600";
  if (position <= 30) return "text-amber-600";
  if (position <= 100) return "text-orange-600";
  return "text-destructive";
};

// Calculate change value (positive = improved, negative = declined)
const getChangeValue = (current: number | null, previous: number | null): number => {
  if (current === null || previous === null) return 0;
  return previous - current; // Positive = ranking went up (improved)
};

// Render change indicator inline with position
const renderPositionWithChange = (position: number | null, previous: number | null) => {
  const change = getChangeValue(position, previous);
  
  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-medium ${getPositionColor(position)}`}>
        {position ?? "-"}
      </span>
      {change !== 0 && (
        <span className={`text-xs font-medium ${change > 0 ? "text-emerald-600" : "text-destructive"}`}>
          {change > 0 ? `↑${change}` : `↓${Math.abs(change)}`}
        </span>
      )}
    </div>
  );
};

const extractSlug = (url: string | null) => {
  if (!url) return "-";
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = parsed.pathname;
    return path.length > 50 ? path.substring(0, 50) + "..." : path || "/";
  } catch {
    return url.substring(0, 50);
  }
};

// Helper to truncate text to max characters
const truncateText = (text: string | null | undefined, maxChars: number = 70) => {
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
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

// Helper to find title from serp_results array by position
const findSerpTitle = (serpResults: SerpResult[] | null, position: number | null): string | undefined => {
  if (!serpResults || position === null) return undefined;
  const match = serpResults.find(r => r.position === position);
  return match?.title;
};

export function KeywordsTable({ 
  keywords, 
  competitorDomains,
  userDomain,
  onDeleteKeywords,
  onRefreshKeywords,
  // Server-side pagination props
  totalCount,
  page = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSearchChange,
  isLoading = false,
}: KeywordsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [showSerpTitles, setShowSerpTitles] = useState(false);

  // Determine if we're using server-side pagination
  const isServerSide = totalCount !== undefined && onPageChange !== undefined;
  const pageCount = isServerSide ? Math.ceil(totalCount / pageSize) : undefined;

  // Handle sorting change for server-side
  const handleSortingChange = (updater: React.SetStateAction<SortingState>) => {
    const newSorting = typeof updater === "function" ? updater(sorting) : updater;
    setSorting(newSorting);
    
    if (isServerSide && onSortChange) {
      const sortCol = newSorting[0];
      onSortChange(sortCol?.id, sortCol?.desc ?? false);
    }
  };

  // Handle search for server-side
  const handleSearchChange = (value: string) => {
    if (isServerSide && onSearchChange) {
      onSearchChange(value);
    } else {
      // Client-side filtering
      setColumnFilters([{ id: "keyword", value }]);
    }
  };

  const columns = useMemo<ColumnDef<ProjectKeyword>[]>(() => [
  {
    id: "select",
    size: 40,
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
      accessorKey: "keyword",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Keyword" />,
      cell: ({ row }) => {
        const hasCompetitors = competitorDomains.length > 0;
        
        return (
          <span 
            className={`font-medium ${hasCompetitors ? 'cursor-pointer hover:text-primary hover:underline' : ''}`}
            onClick={() => hasCompetitors && row.toggleExpanded()}
          >
            {row.getValue("keyword")}
          </span>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "ranking_position",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last" />,
      size: 80, // Increased to accommodate change indicator
      cell: ({ row }) => {
        const position = row.getValue("ranking_position") as number | null;
        const previous = row.original.previous_position;
        return renderPositionWithChange(position, previous);
      },
    },
    {
      accessorKey: "first_position",
      header: ({ column }) => <DataTableColumnHeader column={column} title="First" />,
      size: 55,
      cell: ({ row }) => {
        const position = row.getValue("first_position") as number | null;
        return <span className="text-muted-foreground">{position ?? "-"}</span>;
      },
    },
    {
      accessorKey: "best_position",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Best" />,
      size: 55,
      cell: ({ row }) => {
        const position = row.getValue("best_position") as number | null;
        return (
          <span className={`font-medium ${getPositionColor(position)}`}>
            {position ?? "-"}
          </span>
        );
      },
    },
    // REMOVED: Change column - now merged into Last column
    {
      accessorKey: "found_url",
      header: "URL",
      size: 400,
      maxSize: 400,
      cell: ({ row }) => {
        const url = row.getValue("found_url") as string | null;
        return (
          <span className="text-sm text-muted-foreground truncate block max-w-[400px]" title={url || ""}>
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
    {
      id: "actions",
      header: "",
      size: 60,
      cell: ({ row }) => {
        const serpResults = row.original.serp_results as SerpResult[] | null;
        return (
          <SerpResultsDialog 
            keyword={row.original.keyword}
            serpResults={serpResults}
            userDomain={userDomain}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ], [competitorDomains.length, userDomain]);

  const table = useReactTable({
    data: keywords,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      expanded,
      // Always provide pagination state to prevent undefined errors
      pagination: { pageIndex: page, pageSize },
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: isServerSide ? undefined : getSortedRowModel(),
    getFilteredRowModel: isServerSide ? undefined : getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => competitorDomains.length > 0,
    // Server-side pagination config
    manualPagination: isServerSide,
    manualSorting: isServerSide,
    manualFiltering: isServerSide,
    pageCount: pageCount,
    onPaginationChange: isServerSide ? (updater) => {
      const newState = typeof updater === "function" 
        ? updater({ pageIndex: page, pageSize }) 
        : updater;
      if (newState.pageIndex !== page && onPageChange) {
        onPageChange(newState.pageIndex);
      }
      if (newState.pageSize !== pageSize && onPageSizeChange) {
        onPageSizeChange(newState.pageSize);
      }
    } : undefined,
  });

  const selectedIds = Object.keys(rowSelection)
    .map((index) => keywords[parseInt(index)]?.id)
    .filter(Boolean);

  if (keywords.length === 0 && !isLoading) {
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
        onSearchChange={isServerSide ? handleSearchChange : undefined}
      />
      <div className="rounded-md border max-h-[600px] overflow-y-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-background">
                {headerGroup.headers.map((header) => {
                  const isFixedWidth = header.id === "select";
                  const isActions = header.id === "actions";
                  const columnSize = header.column.columnDef.size;
                  
                  return (
                    <TableHead 
                      key={header.id} 
                      className={isFixedWidth ? "w-10" : isActions ? "w-16" : ""}
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
              table.getRowModel().rows.map((row) => {
                const rankings = row.original.competitor_rankings as Record<string, any> | null;
                const lastChecked = row.original.last_checked_at;
                const visibleColumnIds = table.getVisibleLeafColumns().map(c => c.id);
                
                // serp_results is an array
                const serpResultsArray = row.original.serp_results as SerpResult[] | null;
                const rankingPosition = row.original.ranking_position;
                const serpTitle = findSerpTitle(serpResultsArray, rankingPosition);
                
                return (
                  <React.Fragment key={row.id}>
                    <TableRow data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => {
                        // Special handling for URL column when SERP Titles is ON
                        if (cell.column.id === "found_url" && showSerpTitles && serpTitle) {
                          const url = row.original.found_url;
                          return (
                            <TableCell key={cell.id}>
                              <div className="space-y-0.5 max-w-[400px]">
                                <div className="text-sm text-primary font-medium truncate" title={serpTitle}>
                                  {truncateText(serpTitle, 100)}
                                </div>
                                <span className="text-xs text-muted-foreground truncate block" title={url || ""}>
                                  {extractSlug(url)}
                                </span>
                              </div>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    
                    {/* Expanded Competitor Rankings - rendered as rows in same table */}
                    {row.getIsExpanded() && competitorDomains.length > 0 && 
                      competitorDomains.map((domain) => {
                        const data = rankings?.[domain];
                        const position = typeof data === "object" ? data?.position : data;
                        const firstPos = typeof data === "object" ? data?.first_position : null;
                        const bestPos = typeof data === "object" ? data?.best_position : null;
                        const prevPos = typeof data === "object" ? data?.previous_position : null;
                        const url = typeof data === "object" ? data?.url : null;
                        
                        // Get competitor title from serp_results by their position
                        const competitorTitle = findSerpTitle(serpResultsArray, position);

                        return (
                          <TableRow 
                            key={`${row.id}-competitor-${domain}`} 
                            className="bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary"
                          >
                          {/* Checkbox cell - always visible */}
                            <TableCell></TableCell>
                            
                            {/* Domain (aligned with Keyword column) - always visible */}
                            <TableCell>
                              <DomainWithFavicon domain={domain} showFullDomain size="sm" />
                            </TableCell>
                            
                            {/* Last (with change indicator) - conditionally visible */}
                            {visibleColumnIds.includes("ranking_position") && (
                              <TableCell>
                                {renderPositionWithChange(position ?? null, prevPos ?? null)}
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
                            
                            {/* URL - conditionally visible */}
                            {visibleColumnIds.includes("found_url") && (
                              <TableCell>
                                {showSerpTitles && competitorTitle ? (
                                  <div className="space-y-0.5 max-w-[320px]">
                                    <div className="text-sm text-primary font-medium truncate" title={competitorTitle}>
                                      {truncateText(competitorTitle, 70)}
                                    </div>
                                    <span className="text-xs text-muted-foreground truncate block" title={url || ""}>
                                      {extractSlug(url)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground truncate block max-w-[320px]" title={url || ""}>
                                    {extractSlug(url)}
                                  </span>
                                )}
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
                            
                            {/* Actions column - empty for competitor rows */}
                            {visibleColumnIds.includes("actions") && (
                              <TableCell></TableCell>
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
                  {isLoading ? "Loading..." : "No results."}
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
