import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, ExternalLink, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ProjectKeyword } from "@/hooks/useProjects";

interface KeywordsTableProps {
  keywords: ProjectKeyword[];
  competitorDomains: string[];
}

export function KeywordsTable({ keywords, competitorDomains }: KeywordsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getPositionColor = (position: number | null) => {
    if (position === null) return "text-muted-foreground";
    if (position <= 3) return "text-emerald-600";
    if (position <= 10) return "text-blue-600";
    if (position <= 30) return "text-amber-600";
    if (position <= 100) return "text-orange-600";
    return "text-destructive";
  };

  const getChangeIndicator = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    const change = previous - current; // Positive = improved
    if (change > 0) {
      return (
        <span className="flex items-center gap-1 text-emerald-600">
          <TrendingUp className="h-4 w-4" />
          +{change}
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center gap-1 text-destructive">
          <TrendingDown className="h-4 w-4" />
          {change}
        </span>
      );
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const extractSlug = (url: string | null) => {
    if (!url) return "-";
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      const path = parsed.pathname;
      return path.length > 30 ? path.substring(0, 30) + "..." : path || "/";
    } catch {
      return url.substring(0, 30);
    }
  };

  if (keywords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <p className="text-muted-foreground">No keywords added yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Keyword</TableHead>
            <TableHead className="w-20 text-center">Last</TableHead>
            <TableHead className="w-20 text-center">First</TableHead>
            <TableHead className="w-20 text-center">Best</TableHead>
            <TableHead className="w-24 text-center">Change</TableHead>
            <TableHead className="w-40">URL</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keywords.map((kw, index) => {
            const isExpanded = expandedRows.has(kw.id);
            const hasCompetitors = competitorDomains.length > 0 && kw.competitor_rankings;

            return (
              <>
                <TableRow key={kw.id} className={isExpanded ? "border-b-0" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {hasCompetitors && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleRow(kw.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <span className="text-muted-foreground">{index + 1}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{kw.keyword}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${getPositionColor(kw.ranking_position)}`}>
                      {kw.ranking_position ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground">
                      {kw.first_position ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${getPositionColor(kw.best_position)}`}>
                      {kw.best_position ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getChangeIndicator(kw.ranking_position, kw.previous_position)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground" title={kw.found_url || ""}>
                      {extractSlug(kw.found_url)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {kw.found_url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={kw.found_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded Competitor Rankings */}
                {isExpanded && hasCompetitors && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={8} className="py-3">
                      <div className="pl-10">
                        <p className="text-sm font-medium mb-2">Competitor Rankings:</p>
                        <div className="flex flex-wrap gap-4">
                          {competitorDomains.map((domain) => {
                            const position = kw.competitor_rankings?.[domain];
                            return (
                              <div key={domain} className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{domain}:</span>
                                <Badge
                                  variant={position ? "outline" : "secondary"}
                                  className={position ? getPositionColor(position) : ""}
                                >
                                  {position ?? "Not found"}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
