

## Plan

Two changes: add "Updated X ago" text below the donut chart, and slim down the scrollbar in the Domain Comparison table.

### 1. RankingDistributionChart — Add "Updated X ago" text

- Add a new prop `lastUpdatedAt?: string | null` to the component
- Below the chart+legend flex container, add centered text: title "Distribution health" in `text-lg font-bold`, subtitle "Updated X ago" in `text-sm text-muted-foreground` using `formatDistanceToNow` from date-fns
- In `ProjectDetail.tsx`, compute the most recent `last_checked_at` across all classes and pass it as `lastUpdatedAt` prop

### 2. TopOverviewTable — Thinner scrollbar

- Add custom CSS classes to the `overflow-y-auto` div for a slim scrollbar using Tailwind's `scrollbar-thin` or inline CSS with `[&::-webkit-scrollbar]` utility classes (width ~4px, rounded thumb, subtle color)

| File | Changes |
|------|---------|
| `RankingDistributionChart.tsx` | Add `lastUpdatedAt` prop, render "Distribution health" + "Updated X ago" below chart |
| `TopOverviewTable.tsx` | Add thin custom scrollbar styles to the overflow container |
| `ProjectDetail.tsx` | Compute latest `last_checked_at` from classes, pass to `RankingDistributionChart` |

