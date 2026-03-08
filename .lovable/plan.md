

## Plan

### 1. TopOverviewTable — Fix sticky user domain row background

The user domain row uses `bg-primary/5` (semi-transparent), so when competitor rows scroll underneath, they bleed through. Fix: change to a solid opaque background color like `bg-blue-50` (matching the reference image's light blue highlight) so competitor rows are fully hidden behind it.

**File:** `src/components/projects/TopOverviewTable.tsx`
- Line 92: Change `bg-primary/5` → `bg-blue-50 dark:bg-blue-950` (solid, opaque background)

### 2. RankingStatsCards — Match reference image colors

From the reference image (image-74.png):
- **Card backgrounds**: Light gray/slate rounded cards → add `bg-slate-50 dark:bg-slate-900` to each Card
- **Value colors per tier**:
  - Total Keywords: black (default) ✓
  - Top 1-3: emerald/teal (`text-emerald-600`)
  - Top 4-10: blue (`text-blue-600`)  
  - Top 11-30: amber (`text-amber-600`)
  - Top 31-100: black (default)
  - Not Found: black (default)
- **Badge "Not Found"**: dark/slate badge (reference shows dark pill with `19%`)

**File:** `src/components/projects/RankingStatsCards.tsx`
- Add `bg-slate-50 dark:bg-slate-900` to Card className
- Add value color function: emerald for top3, blue for top10, amber for top30, default for others
- Update notFound badge to use dark/slate style

| File | Change |
|------|--------|
| `TopOverviewTable.tsx` | Solid opaque bg for sticky user domain row |
| `RankingStatsCards.tsx` | Card bg color + value number colors per tier |

