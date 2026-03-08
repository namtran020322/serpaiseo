

## Plan

Replace the current single-Card layout with two separate rounded boxes (header box + table box) matching the reference image exactly.

### Changes to `TopOverviewTable.tsx`

**Structure**: Remove the `Card` wrapper. Use a parent `div` with `flex flex-col gap-4` containing two independent `rounded-2xl bg-slate-50 dark:bg-slate-900` boxes.

**Box 1 — Header**:
- `p-8` padding
- Title: `text-[28px] font-bold`
- Subtitle: `text-[17px] text-muted-foreground`

**Box 2 — Table**:
- `p-6` padding, `rounded-2xl bg-slate-50`
- Remove ALL borders (container border, row border-b, header border-b)
- Header row: uppercase `text-xs font-semibold`, no background band, no border
- Column colors: 1-3 `text-emerald-500`, 4-10 `text-blue-600`, 11-30 `text-orange-500`, 31-100 `text-foreground` (black)
- Data values: `text-[16px] font-bold` with same color coding
- Rows: no border, `hover:bg-white/60 dark:hover:bg-white/5 transition-colors`, `h-14`
- Max height with overflow scroll preserved

| File | Changes |
|------|---------|
| `TopOverviewTable.tsx` | Replace Card with 2 independent rounded boxes, remove all borders, update text sizes and colors per spec |

