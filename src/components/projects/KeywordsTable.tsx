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
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { ProjectKeyword } from "@/hooks/useProjects";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SerpResultsDialog } from "@/components/projects/SerpResultsDialog";
import { format } from "date-fns";
import { toast } from "sonner";

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
    <div className="flex items-center justify-start gap-1.5">
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
        <div className="text-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "keyword",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Keyword" className="justify-start" />,
      cell: ({ row }) => {
        const keyword = row.getValue("keyword") as string;
        const hasCompetitors = competitorDomains.length > 0;
        const isLong = keyword.length > 35;
        
        const content = (
          <span 
            className={cn(
              "font-medium block max-w-[220px] truncate relative text-left",
              hasCompetitors && 'cursor-pointer hover:text-primary hover:underline'
            )}
            onClick={() => hasCompetitors && row.toggleExpanded()}
          >
            {keyword}
            {isLong && (
              <span className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            )}
          </span>
        );
        
        if (isLong) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                {content}
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[400px]">
                <p className="break-words">{keyword}</p>
              </TooltipContent>
            </Tooltip>
          );
        }
        
        return content;
      },
      enableHiding: false,
    },
    {
      accessorKey: "ranking_position",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last" className="justify-start" />,
      size: 80,
      cell: ({ row }) => {
        const position = row.getValue("ranking_position") as number | null;
        const previous = row.original.previous_position;
        return renderPositionWithChange(position, previous);
      },
    },
    {
      accessorKey: "first_position",
      header: ({ column }) => <DataTableColumnHeader column={column} title="First" className="justify-start" />,
      size: 55,
      cell: ({ row }) => {
        const position = row.getValue("first_position") as number | null;
        return <span className="text-muted-foreground block text-left">{position ?? "-"}</span>;
      },
    },
    {
      accessorKey: "best_position",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Best" className="justify-start" />,
      size: 55,
      cell: ({ row }) => {
        const position = row.getValue("best_position") as number | null;
        return (
          <span className={`font-medium block text-left ${getPositionColor(position)}`}>
            {position ?? "-"}
          </span>
        );
      },
    },
    {
      accessorKey: "found_url",
      header: () => <span className="block text-left">URL</span>,
      size: 400,
      maxSize: 400,
      cell: ({ row }) => {
        const url = row.getValue("found_url") as string | null;
        if (!url) return <span className="text-muted-foreground text-left block">-</span>;
        
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
        
        const handleClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          navigator.clipboard.writeText(fullUrl);
          toast.success("URL copied to clipboard");
        };
        
        const handleDoubleClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          window.open(fullUrl, "_blank");
        };
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span 
                className="text-sm text-muted-foreground truncate block max-w-[400px] cursor-pointer hover:text-primary text-left"
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
              >
                {extractSlug(url)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[500px]">
              <p className="break-all text-xs">
                <span className="text-muted-foreground">Click: Copy</span>
                <span className="mx-2">|</span>
                <span className="text-muted-foreground">Double-click: Open</span>
                <br />
                {fullUrl}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "last_checked_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" className="justify-start" />,
      cell: ({ row }) => {
        const date = row.getValue("last_checked_at") as string | null;
        if (!date) return <span className="text-muted-foreground text-left block">-</span>;
        return (
          <div className="text-left">
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
          </div>
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
          <div className="text-left">
            <SerpResultsDialog 
              keyword={row.original.keyword}
              serpResults={serpResults}
              userDomain={userDomain}
            />
          </div>
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
      
      {/* Table container with max height and overflow for sticky header */}
      <div className="rounded-md border max-h-[600px] overflow-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        
        <table className="w-full caption-bottom text-sm">
          {/* Sticky header */}
          <thead className="sticky top-0 z-10 bg-background border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => {
                  const isSelect = header.id === "select";
                  const isKeyword = header.id === "keyword";
                  const isActions = header.id === "actions";
                  const columnSize = header.column.columnDef.size;
                  
                  return (
                    <th 
                      key={header.id} 
                      className={cn(
                        "h-12 px-4 align-middle font-medium text-muted-foreground bg-background whitespace-nowrap text-left",
                        isSelect && "w-10 text-center",
                        isActions && "w-16"
                      )}
                      style={columnSize ? { width: columnSize } : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rankings = row.original.competitor_rankings as Record<string, any> | null;
                const lastChecked = row.original.last_checked_at;
                const visibleColumnIds = table.getVisibleLeafColumns().map(c => c.id);
                
                const serpResultsArray = row.original.serp_results as SerpResult[] | null;
                const rankingPosition = row.original.ranking_position;
                const serpTitle = findSerpTitle(serpResultsArray, rankingPosition);
                
                return (
                  <React.Fragment key={row.id}>
                    {/* Main keyword row */}
                    <tr 
                      className={cn(
                        "border-b transition-colors hover:bg-muted/50",
                        row.getIsSelected() && "bg-muted"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isSelect = cell.column.id === "select";
                        const isKeyword = cell.column.id === "keyword";
                        
                        // Special handling for URL column when SERP Titles is ON
                        if (cell.column.id === "found_url" && showSerpTitles && serpTitle) {
                          const url = row.original.found_url;
                          return (
                            <td key={cell.id} className="p-4 align-middle text-left">
                              <div className="space-y-0.5 max-w-[400px]">
                                <div className="text-sm text-primary font-medium truncate text-left" title={serpTitle}>
                                  {truncateText(serpTitle, 100)}
                                </div>
                                <span className="text-xs text-muted-foreground truncate block text-left" title={url || ""}>
                                  {extractSlug(url)}
                                </span>
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td 
                            key={cell.id} 
                            className={cn(
                              "p-4 align-middle text-left",
                              isSelect && "text-center"
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                    
                    {/* Expanded competitor rows */}
                    {row.getIsExpanded() && competitorDomains.length > 0 && 
                      competitorDomains.map((domain) => {
                        const data = rankings?.[domain];
                        const position = typeof data === "object" ? data?.position : data;
                        const firstPos = typeof data === "object" ? data?.first_position : null;
                        const bestPos = typeof data === "object" ? data?.best_position : null;
                        const prevPos = typeof data === "object" ? data?.previous_position : null;
                        const url = typeof data === "object" ? data?.url : null;
                        
                        const competitorTitle = findSerpTitle(serpResultsArray, position);

                        return (
                          <tr 
                            key={`${row.id}-competitor-${domain}`} 
                            className="bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary border-b"
                          >
                            {/* Checkbox cell - empty */}
                            <td className="p-4 align-middle text-center"></td>
                            
                            {/* Domain (aligned with Keyword column) */}
                            <td className="p-4 align-middle text-left">
                              <DomainWithFavicon domain={domain} showFullDomain size="sm" />
                            </td>
                            
                            {/* Last (with change indicator) */}
                            {visibleColumnIds.includes("ranking_position") && (
                              <td className="p-4 align-middle text-left">
                                {renderPositionWithChange(position ?? null, prevPos ?? null)}
                              </td>
                            )}
                            
                            {/* First */}
                            {visibleColumnIds.includes("first_position") && (
                              <td className="p-4 align-middle text-left text-muted-foreground">
                                {firstPos ?? "-"}
                              </td>
                            )}
                            
                            {/* Best */}
                            {visibleColumnIds.includes("best_position") && (
                              <td className="p-4 align-middle text-left">
                                <span className={`font-medium ${getPositionColor(bestPos ?? null)}`}>
                                  {bestPos ?? "-"}
                                </span>
                              </td>
                            )}
                            
                            {/* URL */}
                            {visibleColumnIds.includes("found_url") && (
                              <td className="p-4 align-middle text-left">
                                {showSerpTitles && competitorTitle ? (
                                  <div className="space-y-0.5 max-w-[320px]">
                                    <div className="text-sm text-primary font-medium truncate text-left" title={competitorTitle}>
                                      {truncateText(competitorTitle, 70)}
                                    </div>
                                    <span className="text-xs text-muted-foreground truncate block text-left" title={url || ""}>
                                      {extractSlug(url)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground truncate block max-w-[320px] text-left" title={url || ""}>
                                    {extractSlug(url)}
                                  </span>
                                )}
                              </td>
                            )}
                            
                            {/* Updated */}
                            {visibleColumnIds.includes("last_checked_at") && (
                              <td className="p-4 align-middle text-left">
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
                              </td>
                            )}
                            
                            {/* Actions column - empty */}
                            {visibleColumnIds.includes("actions") && (
                              <td className="p-4 align-middle text-left"></td>
                            )}
                          </tr>
                        );
                      })
                    }
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center p-4">
                  {isLoading ? "Loading..." : "No results."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <DataTablePagination table={table} />
    </div>
  );
}