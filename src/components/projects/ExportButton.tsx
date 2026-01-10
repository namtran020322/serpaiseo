import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectClassWithKeywords } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
  projectClass: ProjectClassWithKeywords;
}

export function ExportButton({ projectClass }: ExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      // Build CSV header
      const headers = ["Keyword", "Last Position", "First Position", "Best Position", "Change", "URL"];
      
      // Add competitor columns
      const competitors = projectClass.competitor_domains || [];
      competitors.forEach((domain) => {
        headers.push(`${domain} Position`);
      });

      // Build rows
      const rows = projectClass.keywords.map((kw) => {
        const change = kw.previous_position && kw.ranking_position
          ? kw.previous_position - kw.ranking_position
          : "";
        
        const row = [
          `"${kw.keyword.replace(/"/g, '""')}"`,
          kw.ranking_position ?? "",
          kw.first_position ?? "",
          kw.best_position ?? "",
          change,
          kw.found_url ? `"${kw.found_url.replace(/"/g, '""')}"` : "",
        ];

        // Add competitor positions
        competitors.forEach((domain) => {
          const pos = kw.competitor_rankings?.[domain];
          row.push(pos ?? "");
        });

        return row.join(",");
      });

      // Combine and create blob
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      
      // Download
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${projectClass.name.replace(/[^a-z0-9]/gi, "_")}_rankings.csv`;
      link.click();

      toast({
        title: "Export Complete",
        description: `Exported ${projectClass.keywords.length} keywords to CSV`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export data",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    setIsExporting(true);
    try {
      const data = {
        class: {
          name: projectClass.name,
          domain: projectClass.domain,
          country: projectClass.country_name,
          language: projectClass.language_name,
          device: projectClass.device,
          competitors: projectClass.competitor_domains,
          exportedAt: new Date().toISOString(),
        },
        keywords: projectClass.keywords.map((kw) => ({
          keyword: kw.keyword,
          lastPosition: kw.ranking_position,
          firstPosition: kw.first_position,
          bestPosition: kw.best_position,
          previousPosition: kw.previous_position,
          url: kw.found_url,
          competitorRankings: kw.competitor_rankings,
          lastChecked: kw.last_checked_at,
        })),
        stats: projectClass.rankingStats,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${projectClass.name.replace(/[^a-z0-9]/gi, "_")}_rankings.json`;
      link.click();

      toast({
        title: "Export Complete",
        description: `Exported ${projectClass.keywords.length} keywords to JSON`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export data",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || projectClass.keywords.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
