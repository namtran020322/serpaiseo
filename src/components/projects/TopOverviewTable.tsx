import { ProjectClassWithKeywords } from "@/hooks/useProjects";
import { DomainWithFavicon } from "@/components/DomainWithFavicon";
import { useLanguage } from "@/contexts/LanguageContext";

interface TopOverviewTableProps {
  classes: ProjectClassWithKeywords[];
}

export function TopOverviewTable({ classes }: TopOverviewTableProps) {
  const { t } = useLanguage();
  const domainStats = new Map<string, { top3: number; top10: number; top30: number; top100: number; notFound: number; total: number }>();
  const userDomains = new Set<string>();

  classes.forEach((cls) => {
    const userDomain = cls.domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    userDomains.add(userDomain);
    if (!domainStats.has(userDomain)) domainStats.set(userDomain, { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 });
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
          if (!domainStats.has(compDomain)) domainStats.set(compDomain, { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 });
          const compStats = domainStats.get(compDomain)!;
          compStats.total += 1;
          if (position === null) compStats.notFound += 1;
          else if (position <= 3) compStats.top3 += 1;
          else if (position <= 10) compStats.top10 += 1;
          else if (position <= 30) compStats.top30 += 1;
          else if (position <= 100) compStats.top100 += 1;
          else compStats.notFound += 1;
        });
      }
    });
  });

  const sortedDomains = Array.from(domainStats.entries()).sort((a, b) => {
    const scoreA = a[1].top3 * 4 + a[1].top10 * 3 + a[1].top30 * 2 + a[1].top100;
    const scoreB = b[1].top3 * 4 + b[1].top10 * 3 + b[1].top30 * 2 + b[1].top100;
    return scoreB - scoreA;
  });

  const userDomainEntries = sortedDomains.filter(([domain]) => userDomains.has(domain));
  const competitorEntries = sortedDomains.filter(([domain]) => !userDomains.has(domain));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-8">
        <h2 className="text-2xl font-bold tracking-tight">{t("domain.comparison")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("domain.vsCompetitors")}</p>
      </div>
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-6">
        {sortedDomains.length > 0 ? (
          <div className="relative max-h-[320px] overflow-y-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
            <div className="flex flex-col">
              <div className="sticky top-0 z-20 grid grid-cols-[1fr_100px_100px_100px_100px] items-center h-10 px-4 text-xs font-semibold tracking-wider uppercase bg-slate-50 dark:bg-slate-900">
                <span className="text-muted-foreground">{t("domain.headerDomain")}</span>
                <span className="text-center text-emerald-500">1-3</span>
                <span className="text-center text-blue-600">4-10</span>
                <span className="text-center text-orange-500">11-30</span>
                <span className="text-center text-foreground">31-100</span>
              </div>
              {userDomainEntries.map(([domain, stats]) => (
                <div key={domain} className="grid grid-cols-[1fr_100px_100px_100px_100px] items-center h-14 px-4 rounded-lg hover:bg-white/60 dark:hover:bg-white/5 transition-colors">
                  <span className="font-medium text-sm"><DomainWithFavicon domain={domain} maxLength={30} /></span>
                  <span className="text-center text-[16px] font-bold text-emerald-500">{stats.top3}</span>
                  <span className="text-center text-[16px] font-bold text-blue-600">{stats.top10}</span>
                  <span className="text-center text-[16px] font-bold text-orange-500">{stats.top30}</span>
                  <span className="text-center text-[16px] font-bold text-foreground">{stats.top100}</span>
                </div>
              ))}
              {competitorEntries.map(([domain, stats]) => (
                <div key={domain} className="grid grid-cols-[1fr_100px_100px_100px_100px] items-center h-14 px-4 rounded-lg hover:bg-white/60 dark:hover:bg-white/5 transition-colors">
                  <span className="font-medium text-sm"><DomainWithFavicon domain={domain} maxLength={30} /></span>
                  <span className="text-center text-[16px] font-bold text-emerald-500">{stats.top3}</span>
                  <span className="text-center text-[16px] font-bold text-blue-600">{stats.top10}</span>
                  <span className="text-center text-[16px] font-bold text-orange-500">{stats.top30}</span>
                  <span className="text-center text-[16px] font-bold text-foreground">{stats.top100}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">{t("domain.noDomainData")}</div>
        )}
      </div>
    </div>
  );
}