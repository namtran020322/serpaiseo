import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SerpResult {
  position: number;
  title?: string;
  description?: string;
  url?: string;
  breadcrumbs?: string;
}

interface SerpResultsDialogProps {
  keyword: string;
  serpResults: SerpResult[] | null;
  userDomain?: string;
}

// Normalize domain for comparison
const normalizeForComparison = (input: string): string => {
  try {
    const urlString = input.startsWith('http') ? input : `https://${input}`;
    const parsed = new URL(urlString);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return input
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
  }
};

export function SerpResultsDialog({ keyword, serpResults, userDomain }: SerpResultsDialogProps) {
  const [expanded, setExpanded] = useState(false);
  
  if (!serpResults || serpResults.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled className="h-7 text-xs">
        SERP
      </Button>
    );
  }

  const firstTen = serpResults.slice(0, 10);
  const hasMore = serpResults.length > 10;
  const displayedResults = expanded ? serpResults : firstTen;

  // Check if a result URL matches the user's domain
  const isUserDomainRow = (resultUrl?: string): boolean => {
    if (!userDomain || !resultUrl) return false;
    const resultDomain = normalizeForComparison(resultUrl);
    const targetDomain = normalizeForComparison(userDomain);
    return resultDomain === targetDomain || 
           resultDomain.includes(targetDomain) || 
           targetDomain.includes(resultDomain);
  };

  const renderResultRow = (result: SerpResult) => {
    const isHighlighted = isUserDomainRow(result.url);
    
    return (
      <TableRow 
        key={result.position}
        className={isHighlighted ? "bg-primary/10 border-l-4 border-l-primary" : ""}
      >
        <TableCell className="font-medium text-center w-16 align-top">
          <span className={isHighlighted ? "text-primary font-bold" : ""}>
            {result.position}
          </span>
        </TableCell>
        <TableCell>
          <div className="space-y-1.5">
            {result.title && (
              <div className={`text-sm font-medium line-clamp-2 ${isHighlighted ? "text-primary" : "text-foreground"}`}>
                {result.title}
                {isHighlighted && (
                  <Badge variant="secondary" className="ml-2 text-xs">Your site</Badge>
                )}
              </div>
            )}
            {result.description && (
              <div className="text-sm text-muted-foreground line-clamp-2">
                {result.description}
              </div>
            )}
            {result.url && (
              <a 
                href={result.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 break-all"
              >
                {result.url}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          SERP
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-lg">
            SERP Results: <span className="text-primary">{keyword}</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {serpResults.length} results found
            {userDomain && ` • Tracking: ${userDomain}`}
          </p>
        </DialogHeader>
        
        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-16 text-center">Position</TableHead>
                    <TableHead>URL Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedResults.map(renderResultRow)}
                </TableBody>
              </Table>
            </div>
          </div>
        </ScrollArea>
        
        {/* Fixed Footer with Expand/Collapse button */}
        {hasMore && (
          <div className="px-6 py-4 border-t shrink-0 bg-background">
            <Button 
              onClick={() => setExpanded(!expanded)} 
              variant="outline" 
              className="w-full justify-center gap-2"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show Top 10 Only
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show All {serpResults.length} Results
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
