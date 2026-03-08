

## Plan

Redesign the Classes section in `ProjectDetail.tsx` to match the reference image.

### Changes to `ProjectDetail.tsx` (lines 132-190)

Replace the current Classes section with:

1. **Outer container**: `bg-slate-50 rounded-2xl p-6` — light gray background with rounded corners matching other cards
2. **Header inside container**: "Classes" title + subtitle + AddClassDialog button, all inside the gray container
3. **Class items**: Each item wrapped in `bg-white rounded-xl p-4` with `space-y-3` gap between items. No border, no shadow. Hover state with subtle `hover:bg-slate-50` or similar.
4. **Empty state**: Also inside the container

Structure:
```text
<div bg-slate-50 rounded-2xl p-6>
  <header: title + subtitle + add button>
  <div space-y-3>
    <Link bg-white rounded-xl p-4>  ← class item
    <Link bg-white rounded-xl p-4>
    ...
  </div>
</div>
```

| File | Changes |
|------|---------|
| `ProjectDetail.tsx` | Lines 132-190: Restructure Classes section with gray container + white card items |

