import { Table } from "@tanstack/react-table";
import { useState, useEffect, useRef } from "react";
import { X, Trash2, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
  selectedCount?: number;
  onDeleteSelected?: () => void;
  onRefreshSelected?: () => void;
  showSerpTitles?: boolean;
  onToggleSerpTitles?: () => void;
  onSearchChange?: (value: string) => void;
}

export function DataTableToolbar<TData>({
  table, searchKey, searchPlaceholder, selectedCount = 0, onDeleteSelected, onRefreshSelected, showSerpTitles, onToggleSerpTitles, onSearchChange,
}: DataTableToolbarProps<TData>) {
  const { t } = useLanguage();
  const isFiltered = table.getState().columnFilters.length > 0;
  const [searchValue, setSearchValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!onSearchChange) return;
    debounceRef.current = setTimeout(() => onSearchChange(searchValue), 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchValue, onSearchChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSearchChange) { e.preventDefault(); clearTimeout(debounceRef.current); onSearchChange(searchValue); }
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (!onSearchChange && searchKey) table.getColumn(searchKey)?.setFilterValue(value);
  };

  const currentSearchValue = onSearchChange ? searchValue : (searchKey ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? "" : "");

  const columnLabels: Record<string, string> = {
    ranking_position: t("table.columns.ranking"),
    first_position: t("table.columns.firstPosition"),
    best_position: t("table.columns.bestPosition"),
    found_url: t("table.columns.url"),
    last_checked_at: t("table.columns.lastChecked"),
    previous_position: t("table.columns.previous"),
    competitor_rankings: t("table.columns.competitors"),
    serp_results: t("table.columns.serpResults"),
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center space-x-2">
        {searchKey && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder={searchPlaceholder} value={currentSearchValue} onChange={(event) => handleSearchChange(event.target.value)} onKeyDown={handleKeyDown} className="h-9 w-[150px] lg:w-[250px] pl-8" />
          </div>
        )}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            {t("reset")}<X className="ml-2 h-4 w-4" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1"><SlidersHorizontal className="h-4 w-4" />{t("view")}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuLabel>{t("table.toggleColumns")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => {
              const label = columnLabels[column.id] || column.id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
              return <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(!!value)}>{label}</DropdownMenuCheckboxItem>;
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        {onToggleSerpTitles !== undefined && (
          <div className="flex items-center gap-2">
            <Switch id="serp-titles" checked={showSerpTitles} onCheckedChange={onToggleSerpTitles} />
            <Label htmlFor="serp-titles" className="text-sm font-medium cursor-pointer">{t("table.serpTitles")}</Label>
          </div>
        )}
      </div>
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("table.selected", { count: selectedCount })}</span>
          {onRefreshSelected && <Button variant="outline" size="sm" onClick={onRefreshSelected}><RefreshCw className="mr-2 h-4 w-4" />{t("refresh")}</Button>}
          {onDeleteSelected && <Button variant="destructive" size="sm" onClick={onDeleteSelected}><Trash2 className="mr-2 h-4 w-4" />{t("delete")}</Button>}
        </div>
      )}
    </div>
  );
}