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
    <Card>
      <CardHeader>
        <CardTitle>Domain Comparison</CardTitle>
        <CardDescription>Your domain vs competitors</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedDomains.length > 0 ? (
          <div className="relative max-h-[280px] overflow-y-auto rounded-md border">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 z-20 bg-background border-b">
                <tr>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Domain</th>
                  <th className="h-10 px-4 text-center align-middle font-medium text-muted-foreground w-20 whitespace-nowrap">1-3</th>
                  <th className="h-10 px-4 text-center align-middle font-medium text-muted-foreground w-20 whitespace-nowrap">4-10</th>
                  <th className="h-10 px-4 text-center align-middle font-medium text-muted-foreground w-20 whitespace-nowrap">11-30</th>
                  <th className="h-10 px-4 text-center align-middle font-medium text-muted-foreground w-20 whitespace-nowrap">31-100</th>
                </tr>
              </thead>
              <tbody>
                {/* User domain rows — sticky below header */}
                {userDomainEntries.map(([domain, stats]) => (
                  <tr key={domain} className="sticky top-10 z-10 bg-blue-50 dark:bg-blue-950 border-b">
                    <td className="p-4 align-middle font-medium">
                      <DomainWithFavicon domain={domain} maxLength={25} />
                    </td>
                    <td className="p-4 align-middle text-center text-emerald-600 font-medium">{stats.top3}</td>
                    <td className="p-4 align-middle text-center text-blue-600 font-medium">{stats.top10}</td>
                    <td className="p-4 align-middle text-center text-amber-600 font-medium">{stats.top30}</td>
                    <td className="p-4 align-middle text-center text-orange-600 font-medium">{stats.top100}</td>
                  </tr>
                ))}
                {/* Competitor rows — scrollable */}
                {competitorEntries.map(([domain, stats]) => (
                  <tr key={domain} className="border-b last:border-0">
                    <td className="p-4 align-middle font-medium">
                      <DomainWithFavicon domain={domain} maxLength={25} />
                    </td>
                    <td className="p-4 align-middle text-center text-emerald-600 font-medium">{stats.top3}</td>
                    <td className="p-4 align-middle text-center text-blue-600 font-medium">{stats.top10}</td>
                    <td className="p-4 align-middle text-center text-amber-600 font-medium">{stats.top30}</td>
                    <td className="p-4 align-middle text-center text-orange-600 font-medium">{stats.top100}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
