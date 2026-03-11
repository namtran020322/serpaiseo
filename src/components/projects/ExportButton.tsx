import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProjectClassWithKeywords } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExportButtonProps {
  projectClass: ProjectClassWithKeywords;
}

export function ExportButton({ projectClass }: ExportButtonProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = ["Keyword", "Last Position", "First Position", "Best Position", "Change", "URL"];
      const competitors = projectClass.competitor_domains || [];
      competitors.forEach((domain) => {
        headers.push(`${domain} Position`);
        headers.push(`${domain} URL`);
      });
      const rows = projectClass.keywords.map((kw) => {
        const change = kw.previous_position && kw.ranking_position ? kw.previous_position - kw.ranking_position : "";
        const row = [`"${kw.keyword.replace(/"/g, '""')}"`, kw.ranking_position ?? "", kw.first_position ?? "", kw.best_position ?? "", change, kw.found_url ? `"${kw.found_url.replace(/"/g, '""')}"` : ""];
        competitors.forEach((domain) => {
          const raw = kw.competitor_rankings?.[domain];
          const pos = typeof raw === 'object' && raw !== null ? (raw as any).position ?? "" : raw ?? "";
          const url = typeof raw === 'object' && raw !== null ? (raw as any).url ?? "" : "";
          row.push(pos);
          row.push(url ? `"${String(url).replace(/"/g, '""')}"` : "");
        });
        return row.join(",");
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${projectClass.name.replace(/[^a-z0-9]/gi, "_")}_rankings.csv`;
      link.click();
      toast({ title: t("export.complete"), description: t("export.exported", { count: projectClass.keywords.length, format: "CSV" }) });
    } catch (error) {
      toast({ variant: "destructive", title: t("export.failed"), description: t("export.failedDesc") });
    } finally { setIsExporting(false); }
  };

  const exportToJSON = () => {
    setIsExporting(true);
    try {
      const data = {
        class: { name: projectClass.name, domain: projectClass.domain, country: projectClass.country_name, language: projectClass.language_name, device: projectClass.device, competitors: projectClass.competitor_domains, exportedAt: new Date().toISOString() },
        keywords: projectClass.keywords.map((kw) => ({ keyword: kw.keyword, lastPosition: kw.ranking_position, firstPosition: kw.first_position, bestPosition: kw.best_position, previousPosition: kw.previous_position, url: kw.found_url, competitorRankings: kw.competitor_rankings, lastChecked: kw.last_checked_at })),
        stats: projectClass.rankingStats,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${projectClass.name.replace(/[^a-z0-9]/gi, "_")}_rankings.json`;
      link.click();
      toast({ title: t("export.complete"), description: t("export.exported", { count: projectClass.keywords.length, format: "JSON" }) });
    } catch (error) {
      toast({ variant: "destructive", title: t("export.failed"), description: t("export.failedDesc") });
    } finally { setIsExporting(false); }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || projectClass.keywords.length === 0}><Download className="mr-2 h-4 w-4" />{t("export.title")}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>{t("export.csv")}</DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>{t("export.json")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}