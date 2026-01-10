import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CompetitorsFaviconListProps {
  domains: string[];
  maxVisible?: number;
}

const getFaviconUrl = (domain: string) => {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=16`;
};

export function CompetitorsFaviconList({ domains, maxVisible = 3 }: CompetitorsFaviconListProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  if (domains.length === 0) return null;

  const visibleDomains = domains.slice(0, maxVisible);
  const hiddenDomains = domains.slice(maxVisible);
  const hasMore = hiddenDomains.length > 0;

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground mr-1">Competitors:</span>

      <TooltipProvider delayDuration={100}>
        {visibleDomains.map((domain) => (
          <Tooltip key={domain}>
            <TooltipTrigger asChild>
              <div className="h-6 w-6 flex items-center justify-center rounded border bg-background cursor-default hover:bg-muted transition-colors">
                {imgErrors[domain] ? (
                  <span className="text-xs text-muted-foreground">?</span>
                ) : (
                  <img
                    src={getFaviconUrl(domain)}
                    alt=""
                    className="h-4 w-4"
                    onError={() => setImgErrors((prev) => ({ ...prev, [domain]: true }))}
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {domain}
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>

      {hasMore && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs font-medium">
              +{hiddenDomains.length}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <p className="text-sm font-medium mb-2">All Competitors ({domains.length})</p>
            <div className="space-y-1.5">
              {domains.map((domain) => (
                <DomainWithFavicon key={domain} domain={domain} showFullDomain size="sm" />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
