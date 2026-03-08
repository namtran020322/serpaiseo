

## Plan: Apple Design cho trang Projects (`/dashboard/projects`)

Áp dụng phong cách Apple (flat, borderless, layered backgrounds) cho trang danh sách Projects, giống cách đã làm với Classes list trên Project Detail.

### Changes to `Projects.tsx`

1. **Page header**: Giữ nguyên title + subtitle + Add Project button, nhưng style nhẹ hơn — `text-2xl` thay vì `text-3xl`
2. **Wrap toàn bộ table section** trong container `bg-muted/50 rounded-2xl p-6` — tạo layer nền xám nhạt

### Changes to `ProjectsTable.tsx`

1. **Table container**: Bỏ `rounded-md border` wrapper — thay bằng bảng phẳng trực tiếp trên nền xám
2. **Table rows**: Mỗi row project style như white card — `bg-white rounded-xl` không border, không shadow, hover `hover:bg-accent/30`
3. **Table header**: Text nhẹ hơn, `text-xs text-muted-foreground uppercase tracking-wider`, không border-bottom nặng
4. **Badges**: Style nhẹ hơn — bỏ `variant="outline"` cho class count, dùng text thuần

### Changes to `DataTableToolbar.tsx`

1. **Search input**: Style flat hơn — `bg-white border-0 rounded-xl shadow-none` trên nền xám
2. **View button**: `bg-white border-0 rounded-xl` — flat, không viền

### Changes to `DataTablePagination.tsx`

1. **Pagination buttons**: `rounded-xl` thay vì default, style nhẹ hơn

### Summary

| File | Change |
|------|--------|
| `Projects.tsx` | Wrap content trong bg-muted/50 container, giảm title size |
| `ProjectsTable.tsx` | Bỏ border wrapper, row style white card, header nhẹ hơn |
| `DataTableToolbar.tsx` | Search + View button flat style trên nền xám |
| `DataTablePagination.tsx` | Rounded-xl buttons |

