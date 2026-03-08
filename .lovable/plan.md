

## Plan

### 1. Domain Comparison — Sticky header + user domain, scrollable competitors

**Current:** Shows max 5 domains with "Show X more domains" button to expand.

**New behavior:**
- Always show ALL domains (remove expand/collapse logic)
- Container has `max-h` to fit ~5 rows, overflow-y auto for scrolling
- Table header row → `sticky top-0`
- First row (user domain, highlighted with `bg-primary/5`) → `sticky` below header
- Only competitor rows scroll

**Implementation in `TopOverviewTable.tsx`:**
- Remove `isExpanded` state and the toggle Button
- Separate user domain (first sorted entry) from competitors
- Render header as sticky `top-0`, user domain row as sticky with calculated offset (~41px)
- Wrap table in a scrollable container with max height (~280px for ~5 visible rows)

### 2. RankingStatsCards — Match reference image colors/sizes

**Reference image shows:**
- Label: small gray text (current ✓)
- Value number: **large bold black** (current is `text-2xl`, image shows larger)
- Percentage badge: small colored badge — green for positive tiers, red/coral for "Not Found"
- Trend icons: green `↗` and red `↘` with numbers, smaller text

**Changes in `RankingStatsCards.tsx`:**
- Value: increase to `text-3xl font-bold`
- Percentage: wrap in a colored `Badge` — use green/emerald tones for Top tiers, coral/red for Not Found (currently plain `text-muted-foreground`, image shows colored pill badges)
- Keep card background unchanged

| File | Changes |
|------|---------|
| `TopOverviewTable.tsx` | Remove expand/collapse, add scroll container with sticky header + sticky user domain row |
| `RankingStatsCards.tsx` | Larger value text, colored percentage badges matching reference |

