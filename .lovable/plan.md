

## Plan

The reference image shows a clean, flat table style — no rounded floating rows, no gaps between rows. Instead it uses a traditional table layout with:

- A single light gray background band for the header row
- Simple horizontal dividers between rows (no rounded cards, no gap)
- Generous row height and padding
- Header text: "DOMAIN" left-aligned, ranking columns right/center-aligned with tier colors
- Data values: bold, color-coded per tier (green 1-3, blue 4-10, orange 11-30, dark 31-100)
- No ring/border on user domain row, no rounded-xl per row

### Changes to `TopOverviewTable.tsx`

Replace the current `flex flex-col gap-1.5` rounded-row layout with a flat table-like layout:

1. **Remove** `rounded-xl` from all rows and the `gap-1.5` between them
2. **Header**: `bg-slate-100 dark:bg-slate-800` with `border-b`, uppercase bold text, no rounding
3. **Data rows**: Plain white background, separated by `border-b border-slate-100`, no rounding, no ring
4. **User domain row**: Remove special blue bg and ring — treat same as other rows (or keep very subtle highlight)
5. **Row height**: Taller rows (~h-14) with more padding to match the spacious reference
6. **Grid columns**: Widen ranking columns slightly `grid-cols-[1fr_100px_100px_100px_100px]`
7. **Values**: Keep color coding, increase font weight to `font-bold`

| File | Changes |
|------|---------|
| `TopOverviewTable.tsx` | Replace rounded floating rows with flat table rows, border separators, spacious padding |

