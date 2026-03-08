

## Plan

Three changes to make:

### 1. Move "Distribution health" text below the chart only (not centered across full width)

In `RankingDistributionChart.tsx`, move the "Distribution health" + "Updated X ago" block from after the flex container to inside the chart's column, directly below the donut chart — aligned with the chart center.

Current layout: `[chart + legend] → [health text full-width centered]`
New layout: `[chart column (chart + health text) | legend column]`

Wrap the chart and health text in a `flex flex-col items-center` container so they stack vertically and the text aligns with the chart center.

### 2. Fix "Updated never" — ensure `last_checked_at` is passed correctly

The current `ProjectDetail.tsx` logic already computes `lastUpdatedAt` from classes. The issue is likely that `cls.last_checked_at` and `cls.updated_at` are both null/undefined. Check and also fallback to `cls.created_at` to avoid showing "never".

### 3. Dialog/AlertDialog border radius → `rounded-2xl`

In `dialog.tsx` and `alert-dialog.tsx`, change `sm:rounded-lg` to `rounded-2xl` to match the global 16px radius standard.

| File | Changes |
|------|---------|
| `RankingDistributionChart.tsx` | Restructure layout so health text sits directly below chart, aligned to chart center |
| `ProjectDetail.tsx` | Add `created_at` fallback in lastUpdatedAt computation |
| `dialog.tsx` | `sm:rounded-lg` → `rounded-2xl` |
| `alert-dialog.tsx` | `sm:rounded-lg` → `rounded-2xl` |

