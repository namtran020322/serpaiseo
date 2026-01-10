import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Location } from "@/data/locations";

interface LocationComboboxProps {
  locations: Location[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MAX_DISPLAY_ITEMS = 50;
const SEARCH_THRESHOLD = 100;

export function LocationCombobox({
  locations,
  value,
  onValueChange,
  placeholder = "Select location",
  disabled = false,
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Reset search when popover closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  // Get selected location name
  const selectedLocation = useMemo(() => {
    return locations.find((loc) => loc.id === value);
  }, [locations, value]);

  // Filter and limit locations based on search
  const filteredLocations = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    let filtered = locations;
    if (query) {
      filtered = locations.filter(
        (loc) =>
          loc.name.toLowerCase().includes(query) ||
          loc.canonicalName.toLowerCase().includes(query)
      );
    }
    
    return filtered.slice(0, MAX_DISPLAY_ITEMS);
  }, [locations, searchQuery]);

  const totalCount = locations.length;
  const needsSearch = totalCount > SEARCH_THRESHOLD;
  const showingLimited = filteredLocations.length < (searchQuery ? locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      loc.canonicalName.toLowerCase().includes(searchQuery.toLowerCase().trim())
  ).length : totalCount);

  if (totalCount === 0) {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full justify-between text-muted-foreground"
      >
        No locations available
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selectedLocation ? selectedLocation.canonicalName : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={needsSearch ? `Search ${totalCount.toLocaleString()} locations...` : "Search..."}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center text-sm">
                <Search className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p>No locations found</p>
                {needsSearch && (
                  <p className="text-muted-foreground mt-1">Try a different search term</p>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredLocations.map((loc) => (
                <CommandItem
                  key={loc.id}
                  value={loc.id}
                  onSelect={() => {
                    onValueChange(loc.id === value ? "" : loc.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === loc.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{loc.canonicalName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {showingLimited && (
              <div className="px-2 py-2 text-xs text-center text-muted-foreground border-t">
                Showing {filteredLocations.length} of {searchQuery ? "matching" : totalCount.toLocaleString()} locations
                {!searchQuery && needsSearch && " — type to search"}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
