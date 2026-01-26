import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRankingDates } from "@/hooks/useRankingDates";
import { cn } from "@/lib/utils";

interface HistoryDatePickerProps {
  classId: string;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

export function HistoryDatePicker({
  classId,
  selectedDate,
  onDateSelect,
}: HistoryDatePickerProps) {
  const [open, setOpen] = useState(false);
  const { data: datesWithData = [], isLoading } = useRankingDates(classId);

  // Convert string dates to Date objects for comparison
  const datesWithDataSet = new Set(datesWithData);

  const hasData = (date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    return datesWithDataSet.has(dateStr);
  };

  // Custom modifiers for days with data
  const modifiers = {
    hasData: (date: Date) => hasData(date),
  };

  const modifiersClassNames = {
    hasData: "bg-primary/10 font-medium",
  };

  const handleSelect = (date: Date | undefined) => {
    onDateSelect(date);
    if (date) {
      setOpen(false);
    }
  };

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
            "gap-2 min-w-[140px] justify-start",
            selectedDate && "text-primary"
          )}
        >
          <CalendarDays className="h-4 w-4" />
          <span>{selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Today"}</span>
          {selectedDate && (
            <X
              className="h-3 w-3 ml-auto opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        {/* Legend */}
        <div className="p-3 pb-2 flex items-center gap-4 text-sm border-b">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary/20 relative">
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-1 h-1 bg-primary rounded-full" />
            </div>
            <span className="text-muted-foreground text-xs">Has data</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <span className="text-muted-foreground text-xs">No data</span>
          </div>
        </div>

        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={(date) => date > new Date()}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className={cn("p-3 pointer-events-auto")}
          components={{
            DayContent: ({ date }) => {
              const dateHasData = hasData(date);
              const isSelected = selectedDate && isSameDay(date, selectedDate);

              return (
                <div className="relative flex items-center justify-center w-full h-full">
                  <span
                    className={cn(
                      dateHasData && !isSelected && "text-primary"
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {dateHasData && (
                    <div
                      className={cn(
                        "absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full",
                        isSelected ? "bg-primary-foreground" : "bg-primary"
                      )}
                    />
                  )}
                </div>
              );
            },
          }}
        />

        {isLoading && (
          <div className="px-3 pb-3 text-xs text-muted-foreground text-center">
            Loading dates...
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
