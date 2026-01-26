import { useState } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HistoryDatePickerProps {
  datesWithData: string[]; // Array of dates in yyyy-MM-dd format
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  isLoading?: boolean;
}

export function HistoryDatePicker({
  datesWithData,
  selectedDate,
  onDateSelect,
  isLoading = false,
}: HistoryDatePickerProps) {
  const [open, setOpen] = useState(false);

  // Convert string dates to Date objects for comparison
  const datesWithDataSet = new Set(datesWithData);

  // Custom day render with highlight for dates with data
  const modifiers = {
    hasData: (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return datesWithDataSet.has(dateStr);
    },
  };

  const modifiersClassNames = {
    hasData: "bg-primary/10 relative",
  };

  // Handle date selection
  const handleSelect = (date: Date | undefined) => {
    onDateSelect(date);
    setOpen(false);
  };

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateSelect(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal gap-2",
            !selectedDate && "text-muted-foreground",
            selectedDate && "pr-2"
          )}
          disabled={isLoading}
        >
          <CalendarIcon className="h-4 w-4" />
          {selectedDate ? (
            <>
              <span>{format(selectedDate, "dd/MM/yyyy")}</span>
              <span 
                className="ml-1 h-4 w-4 rounded-sm hover:bg-muted inline-flex items-center justify-center cursor-pointer"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </span>
            </>
          ) : (
            <span>View History</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-3 pb-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={(date) => date > new Date()}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            initialFocus
            className="pointer-events-auto"
            components={{
              DayContent: ({ date }) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const hasData = datesWithDataSet.has(dateStr);
                
                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <span>{date.getDate()}</span>
                    {hasData && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </div>
                );
              },
            }}
          />
        </div>
        {/* Legend */}
        <div className="px-3 pb-3 pt-2 border-t mt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-primary/10 relative flex items-center justify-center">
                <span className="absolute bottom-0 w-1 h-1 rounded-full bg-primary" />
              </div>
              <span>Has ranking data</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
