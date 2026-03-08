

## Plan

### Changes Required

Based on the reference images, I need to make these adjustments:

### 1. Card Background Colors
Add `bg-slate-50 dark:bg-slate-900` to both `RankingDistributionChart` and `TopOverviewTable` Cards to match the stats cards.

### 2. TopOverviewTable — Match Reference Image Style

**From image-75.png:**
- Remove border from the scrollable container
- Header row: light gray background, smaller height
- Data rows: white/card background with subtle bottom border
- User domain row: light blue background (already have this)
- Reduce row padding to make heights equal to header (h-10 for all)
- Header text colors: "1-3" green, "4-10" blue, "11-30" amber/orange, "31-100" gray

**Implementation:**
- Change container from `border` to no border
- Header: `bg-slate-100 dark:bg-slate-800`
- All rows use `h-10` with `px-4 py-2` (reduced from p-4)
- Add colored header text for ranking columns

### 3. RankingDistributionChart — Match Reference Image Style

**From image-76.png:**
- Chart colors: Emerald (Top 3), Blue (Top 4-10), Coral/Orange (Top 11-30), Black (Not Found)
- No Top 31-100 in legend (or combine with Not Found as black)
- Legend items: pill-style badges on the right side, not below
- Layout: chart on left, legend as stacked pills on right

**Implementation:**
- Update chart colors in chartConfig
- Hide Recharts Legend, create custom legend with pill badges
- Use flexbox layout: chart left (60%), custom legend right (40%)
- Each legend item: white pill with colored dot indicator + label text

| File | Changes |
|------|---------|
| `TopOverviewTable.tsx` | bg-slate-50 card, styled header with colored column titles, equal row heights, no outer border |
| `RankingDistributionChart.tsx` | bg-slate-50 card, updated colors, custom pill legend layout beside chart |

