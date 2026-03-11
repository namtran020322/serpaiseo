import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  text: string;
  className?: string;
}

export function InfoTooltip({ text, className }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center justify-center cursor-help", className)}>
            <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] text-sm" side="top">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
