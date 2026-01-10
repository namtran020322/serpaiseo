import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProjectClassWithKeywords } from "@/hooks/useProjects";

interface TopOverviewTableProps {
  classes: ProjectClassWithKeywords[];
}

export function TopOverviewTable({ classes }: TopOverviewTableProps) {
  // Collect all unique domains (user domains + competitor domains)
  const domainStats = new Map<string, { top3: number; top10: number; top30: number; top100: number; notFound: number; total: number }>();

  classes.forEach((cls) => {
    // Add user domain stats
    const userDomain = cls.domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
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

    // Process competitor rankings from keywords
    cls.keywords.forEach((kw) => {
      if (kw.competitor_rankings) {
        Object.entries(kw.competitor_rankings).forEach(([compDomain, position]) => {
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
    // Sort by weighted score (top3 matters more)
    const scoreA = a[1].top3 * 4 + a[1].top10 * 3 + a[1].top30 * 2 + a[1].top100;
    const scoreB = b[1].top3 * 4 + b[1].top10 * 3 + b[1].top30 * 2 + b[1].top100;
    return scoreB - scoreA;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain Comparison</CardTitle>
        <CardDescription>Your domain vs competitors</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedDomains.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead className="text-center w-16">1-3</TableHead>
                <TableHead className="text-center w-16">4-10</TableHead>
                <TableHead className="text-center w-16">11-30</TableHead>
                <TableHead className="text-center w-16">31-100</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDomains.slice(0, 10).map(([domain, stats], index) => (
                <TableRow key={domain} className={index === 0 ? "bg-primary/5" : ""}>
                  <TableCell className="font-medium">
                    {domain.length > 25 ? domain.substring(0, 25) + "..." : domain}
                  </TableCell>
                  <TableCell className="text-center text-emerald-600 font-medium">{stats.top3}</TableCell>
                  <TableCell className="text-center text-blue-600 font-medium">{stats.top10}</TableCell>
                  <TableCell className="text-center text-amber-600 font-medium">{stats.top30}</TableCell>
                  <TableCell className="text-center text-orange-600 font-medium">{stats.top100}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No domain data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
