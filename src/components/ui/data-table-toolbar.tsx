import { Table } from "@tanstack/react-table";
import { useState, useEffect } from "react";
import { X, Trash2, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
  selectedCount?: number;
  onDeleteSelected?: () => void;
  onRefreshSelected?: () => void;
  showSerpTitles?: boolean;
  onToggleSerpTitles?: () => void;
  // Server-side search callback
  onSearchChange?: (value: string) => void;
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = "Search...",
  selectedCount = 0,
  onDeleteSelected,
  onRefreshSelected,
  showSerpTitles,
  onToggleSerpTitles,
  onSearchChange,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const [searchValue, setSearchValue] = useState("");
  
  // Debounce server-side search
  useEffect(() => {
    if (!onSearchChange) return;
    
    const timer = setTimeout(() => {
      onSearchChange(searchValue);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchValue, onSearchChange]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    // If not using server-side search, use client-side filtering
    if (!onSearchChange && searchKey) {
      table.getColumn(searchKey)?.setFilterValue(value);
    }
  };

  const currentSearchValue = onSearchChange 
    ? searchValue 
    : (searchKey ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? "" : "");

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center space-x-2">
        {searchKey && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={currentSearchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="h-9 w-[150px] lg:w-[250px] pl-8"
            />
          </div>
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              <SlidersHorizontal className="h-4 w-4" />
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {onToggleSerpTitles !== undefined && (
          <div className="flex items-center gap-2">
            <Switch
              id="serp-titles"
              checked={showSerpTitles}
              onCheckedChange={onToggleSerpTitles}
            />
            <Label htmlFor="serp-titles" className="text-sm font-medium cursor-pointer">
              SERP Titles
            </Label>
          </div>
        )}
      </div>
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedCount} selected
          </span>
          {onRefreshSelected && (
            <Button variant="outline" size="sm" onClick={onRefreshSelected}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          )}
          {onDeleteSelected && (
            <Button variant="destructive" size="sm" onClick={onDeleteSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
