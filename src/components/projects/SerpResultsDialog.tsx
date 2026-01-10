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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
}

export function SerpResultsDialog({ keyword, serpResults }: SerpResultsDialogProps) {
  const [expanded, setExpanded] = useState(false);
  
  if (!serpResults || serpResults.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled className="h-7 text-xs">
        SERP
      </Button>
    );
  }

  const firstTen = serpResults.slice(0, 10);
  const remaining = serpResults.slice(10);
  const hasMore = remaining.length > 0;

  const renderResultRow = (result: SerpResult) => (
    <TableRow key={result.position}>
      <TableCell className="font-medium text-center w-16 align-top">
        {result.position}
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {result.title && (
            <div className="text-sm font-medium text-primary line-clamp-2">
              {result.title}
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
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 break-all"
            >
              {result.url}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          SERP
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            SERP Results: <span className="text-primary">{keyword}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Position</TableHead>
                <TableHead>URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {firstTen.map(renderResultRow)}
            </TableBody>
          </Table>
        </div>
        
        {/* Collapsible for remaining results */}
        {hasMore && (
          <Collapsible open={expanded} onOpenChange={setExpanded} className="mt-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-center gap-2">
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show {remaining.length} more results
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="rounded-md border mt-2">
                <Table>
                  <TableBody>
                    {remaining.map(renderResultRow)}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </DialogContent>
    </Dialog>
  );
}
