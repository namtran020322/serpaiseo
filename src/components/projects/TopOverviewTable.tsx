import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProjectClassWithKeywords } from "@/hooks/useProjects";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";

interface TopOverviewTableProps {
  classes: ProjectClassWithKeywords[];
}

export function TopOverviewTable({ classes }: TopOverviewTableProps) {
  // Collect all unique domains (user domains + competitor domains)
  const domainStats = new Map<string, { top3: number; top10: number; top30: number; top100: number; notFound: number; total: number }>();

  // Track user domains
  const userDomains = new Set<string>();

  classes.forEach((cls) => {
    const userDomain = cls.domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    userDomains.add(userDomain);
    if (!domainStats.has(userDomain)) {
      domainStats.set(userDomain, { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 });
    }
    const userStats = domainStats.get(userDomain)!;
    userStats.top3 += cls.rankingStats.top3;
    userStats.top10 += cls.rankingStats.top10;
    userStats.top30 += cls.rankingStats.top30;
    userStats.top100 += cls.rankingStats.top100;
    userStats.notFound += cls.rankingStats.notFound;
    userStats.total += cls.rankingStats.total;

    cls.keywords.forEach((kw) => {
      if (kw.competitor_rankings) {
        Object.entries(kw.competitor_rankings).forEach(([compDomain, data]) => {
          const position = typeof data === 'number' ? data : (data as any)?.position ?? null;
          
          if (!domainStats.has(compDomain)) {
            domainStats.set(compDomain, { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 });
          }
          const compStats = domainStats.get(compDomain)!;
          compStats.total += 1;
          
          if (position === null) {
            compStats.notFound += 1;
          } else if (position <= 3) {
            compStats.top3 += 1;
          } else if (position <= 10) {
            compStats.top10 += 1;
          } else if (position <= 30) {
            compStats.top30 += 1;
          } else if (position <= 100) {
            compStats.top100 += 1;
          } else {
            compStats.notFound += 1;
          }
        });
      }
    });
  });

  const sortedDomains = Array.from(domainStats.entries()).sort((a, b) => {
    const scoreA = a[1].top3 * 4 + a[1].top10 * 3 + a[1].top30 * 2 + a[1].top100;
    const scoreB = b[1].top3 * 4 + b[1].top10 * 3 + b[1].top30 * 2 + b[1].top100;
    return scoreB - scoreA;
  });

  // Separate user domain(s) from competitors
  const userDomainEntries = sortedDomains.filter(([domain]) => userDomains.has(domain));
  const competitorEntries = sortedDomains.filter(([domain]) => !userDomains.has(domain));

  return (
    <Card className="bg-slate-50 dark:bg-slate-900">
      <CardHeader>
        <CardTitle>Domain Comparison</CardTitle>
        <CardDescription>Your domain vs competitors</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedDomains.length > 0 ? (
          <div className="relative max-h-[320px] overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              {/* Header row */}
              <div className="sticky top-0 z-20 grid grid-cols-[1fr_80px_80px_80px_80px] items-center h-10 px-5 rounded-xl bg-muted/60 dark:bg-muted/30 text-xs font-medium tracking-wide uppercase">
                <span className="text-muted-foreground">Domain</span>
                <span className="text-center text-emerald-600 dark:text-emerald-400">1-3</span>
                <span className="text-center text-blue-600 dark:text-blue-400">4-10</span>
                <span className="text-center text-amber-600 dark:text-amber-400">11-30</span>
                <span className="text-center text-muted-foreground">31-100</span>
              </div>
              {/* User domain rows */}
              {userDomainEntries.map(([domain, stats]) => (
                <div key={domain} className="sticky top-11 z-10 grid grid-cols-[1fr_80px_80px_80px_80px] items-center h-12 px-5 rounded-xl bg-blue-50 dark:bg-blue-950/60 ring-1 ring-blue-200/50 dark:ring-blue-800/30">
                  <span className="font-medium text-sm"><DomainWithFavicon domain={domain} maxLength={30} /></span>
                  <span className="text-center text-sm font-semibold text-emerald-600">{stats.top3}</span>
                  <span className="text-center text-sm font-semibold text-blue-600">{stats.top10}</span>
                  <span className="text-center text-sm font-semibold text-amber-600">{stats.top30}</span>
                  <span className="text-center text-sm font-semibold text-orange-600">{stats.top100}</span>
                </div>
              ))}
              {/* Competitor rows */}
              {competitorEntries.map(([domain, stats]) => (
                <div key={domain} className="grid grid-cols-[1fr_80px_80px_80px_80px] items-center h-12 px-5 rounded-xl bg-background hover:bg-muted/40 transition-colors">
                  <span className="font-medium text-sm"><DomainWithFavicon domain={domain} maxLength={30} /></span>
                  <span className="text-center text-sm font-semibold text-emerald-600">{stats.top3}</span>
                  <span className="text-center text-sm font-semibold text-blue-600">{stats.top10}</span>
                  <span className="text-center text-sm font-semibold text-amber-600">{stats.top30}</span>
                  <span className="text-center text-sm font-semibold text-orange-600">{stats.top100}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No domain data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
