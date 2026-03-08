

## Plan

Update `RankingDistributionChart.tsx` to match the reference images:

### Changes

**1. Donut chart — bigger with center label**
- Increase chart container from `h-[200px]` to `h-[280px]`
- Increase `innerRadius` from 50→85, `outerRadius` from 80→120
- Add `cornerRadius={6}` and `strokeWidth={0}` for the rounded thick donut look from image 1
- Add a custom center label showing total keywords count + "TOTAL KEYWORDS" text using Recharts `customized` or absolute positioned div
- Remove `top100` from chart colors — reference only shows emerald, blue, orange, dark

**2. Legend pills — more compact**
- Reduce padding from `px-3 py-2` to `px-3 py-1.5`
- Reduce gap between pills from `gap-2` to `gap-1.5`

**3. Layout**
- Keep flex layout but give chart more space: chart `flex-1` instead of fixed size, legend `w-[220px] flex-shrink-0`

| File | Changes |
|------|---------|
| `RankingDistributionChart.tsx` | Enlarge donut chart with center label, add cornerRadius for rounded segments, compact legend pills, adjust flex proportions |

