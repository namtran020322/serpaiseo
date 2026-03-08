
## Plan

### Changes Required

Based on the user's request and reference image:

1. **Cards**: Change border radius from `rounded-lg` (8px) to `rounded-2xl` (16px)

2. **Buttons**: Change from `rounded-md` (6px) to `rounded-full` (pill shape) to match the reference image showing a fully rounded button

### Implementation

| File | Change |
|------|--------|
| `src/components/ui/card.tsx` | Line 6: `rounded-lg` → `rounded-2xl` |
| `src/components/ui/button.tsx` | Line 8: `rounded-md` → `rounded-full`; Line 21, 22: remove size-specific `rounded-md` |
