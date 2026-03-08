

## Plan

Two changes: normalize heading sizes and vertically center the legend pills.

### 1. Normalize heading sizes

The `RankingDistributionChart` uses `CardTitle` (`text-2xl`) and `CardDescription` (`text-sm`). The other sections use larger custom sizes:

- **Domain Comparison header**: `text-[28px]` → change to `text-2xl` (matches CardTitle)
- **Domain Comparison subtitle**: `text-[17px]` → change to `text-sm` (matches CardDescription)
- **Project header** (`h1`): `text-3xl` → change to `text-2xl`
- **Project subtitle line**: already `text-sm`, no change
- **Classes heading**: `text-xl` → change to `text-lg` to be proportional
- **Classes subtitle**: already `text-sm`, fine

| File | Line | Change |
|------|------|--------|
| `TopOverviewTable.tsx` | 72-73 | `text-[28px]` → `text-2xl`, `text-[17px]` → `text-sm` |
| `ProjectDetail.tsx` | 93 | `text-3xl` → `text-2xl` |
| `ProjectDetail.tsx` | 136 | `text-xl` → `text-lg` |

### 2. Vertically center legend pills beside chart

The legend column currently uses `items-start` on the parent flex, causing it to sit at the top. Change the flex container from `items-start` to `items-center` so the legend pills are vertically centered relative to the donut chart.

| File | Line | Change |
|------|------|--------|
| `RankingDistributionChart.tsx` | 63 | `items-start` → `items-center` |

