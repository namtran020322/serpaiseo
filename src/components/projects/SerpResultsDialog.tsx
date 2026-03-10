import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Search, Hash, List, Globe, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";

interface SerpResult { position: number; title?: string; description?: string; url?: string; breadcrumbs?: string; }
interface SerpResultsDialogProps { keyword: string; serpResults: SerpResult[] | null; userDomain?: string; }

const normalizeForComparison = (input: string): string => {
  try { const urlString = input.startsWith('http') ? input : `https://${input}`; const parsed = new URL(urlString); return parsed.hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return input.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]; }
};

export function SerpResultsDialog({ keyword, serpResults, userDomain }: SerpResultsDialogProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  if (!serpResults || serpResults.length === 0) {
    return <Button variant="outline" size="sm" disabled className="h-7 text-xs">SERP</Button>;
  }

  const firstTen = serpResults.slice(0, 10);
  const hasMore = serpResults.length > 10;
  const displayedResults = expanded ? serpResults : firstTen;

  const isUserDomainRow = (resultUrl?: string): boolean => {
    if (!userDomain || !resultUrl) return false;
    const resultDomain = normalizeForComparison(resultUrl);
    const targetDomain = normalizeForComparison(userDomain);
    return resultDomain === targetDomain || resultDomain.includes(targetDomain) || targetDomain.includes(resultDomain);
  };

  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="h-7 text-xs">SERP</Button></DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden">
        <div className="px-7 py-5 border-b shrink-0 space-y-4">
          <div className="flex items-center gap-3"><Search className="h-5 w-5 text-foreground" /><h2 className="text-lg font-semibold text-foreground">{t("serp.title")}</h2></div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-foreground text-background text-[13px] font-semibold px-3.5 py-1.5 rounded-full"><Hash className="h-3.5 w-3.5" />{keyword}</span>
            <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><List className="h-3.5 w-3.5" />{t("serp.results", { count: serpResults.length })}</span>
              {userDomain && <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{t("serp.tracking", { domain: userDomain })}</span>}
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-7 pb-7 pt-0">
            {displayedResults.map((result, index) => {
              const isHighlighted = isUserDomainRow(result.url);
              return (
                <div key={result.position}>
                  <div className={`flex gap-4 p-4 ${isHighlighted ? "bg-primary/[0.04] border border-primary/20 rounded-[10px] my-2" : "rounded-lg"}`}>
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isHighlighted ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      <span className="text-base font-bold">{result.position}</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {result.title && (
                        <div className="flex items-start gap-2">
                          <span className={`text-sm font-semibold leading-snug line-clamp-2 ${isHighlighted ? "text-primary" : "text-foreground"}`}>{result.title}</span>
                          {isHighlighted && <Badge className="shrink-0 bg-green-600 hover:bg-green-600 text-white text-[11px] px-2.5 py-0.5 rounded-full gap-1"><Star className="h-3 w-3" />{t("serp.yourSite")}</Badge>}
                        </div>
                      )}
                      {result.description && <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">{result.description}</p>}
                      {result.url && <a href={result.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-xs hover:underline ${isHighlighted ? "text-primary" : "text-muted-foreground"}`}><ExternalLink className="h-3 w-3 flex-shrink-0" /><span className="truncate max-w-[500px]">{result.url}</span></a>}
                    </div>
                  </div>
                  {index < displayedResults.length - 1 && <Separator className="my-0" />}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        {hasMore && (
          <div className="px-7 py-4 border-t shrink-0 bg-background">
            <Button onClick={() => setExpanded(!expanded)} variant="outline" className="w-full justify-center gap-2">
              {expanded ? (<><ChevronUp className="h-4 w-4" />{t("serp.showTopOnly")}</>) : (<><ChevronDown className="h-4 w-4" />{t("serp.showAll", { count: serpResults.length })}</>)}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}