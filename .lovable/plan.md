

## Kế hoạch Cải thiện Tables và Security

### Tổng quan các nhiệm vụ

| # | Nhiệm vụ | Loại |
|---|----------|------|
| 1 | Thêm ranking trend indicators (↗/↘) cho 3 cột ranking trong Projects table | Database + Frontend |
| 2 | Enable password leak protection trong Auth settings | Auth Configuration |
| 3 | Sửa Projects table: header không xuống hàng, columns linh động, căn phải (trừ Name) | Frontend |
| 4 | Sửa Keywords table: căn phải tất cả columns (trừ Keyword) | Frontend |

---

## 1. Ranking Trend Indicators cho Projects Table

### Yêu cầu
Hiển thị chỉ báo biến động hàng tuần (↗/↘) bên cạnh 3 cột top ranking (1-3, 4-10, 11-30)

### Cập nhật Database RPC

**File: Migration - Update `get_projects_paginated`**

Thêm 3 cột mới để so sánh ranking 7 ngày trước:

```sql
-- top3_change: số keyword tăng/giảm vào top 3 so với 7 ngày trước
-- top10_change: số keyword tăng/giảm vào top 4-10 so với 7 ngày trước  
-- top30_change: số keyword tăng/giảm vào top 11-30 so với 7 ngày trước

-- Logic: So sánh ranking_position hiện tại với dữ liệu từ keyword_ranking_history 7 ngày trước
```

### Cập nhật Interface

**File: `src/hooks/useProjectsPaginated.ts`**

```typescript
export interface PaginatedProject {
  // ... existing fields
  top3_change: number;   // +2 = có thêm 2 keywords vào top3
  top10_change: number;  
  top30_change: number;
}
```

### Cập nhật Frontend

**File: `src/components/projects/ProjectsTable.tsx`**

```typescript
{
  id: "top3",
  header: () => <span className="whitespace-nowrap">1-3</span>,
  cell: ({ row }) => {
    const count = row.original.top3_count || 0;
    const change = row.original.top3_change || 0;
    return (
      <div className="flex items-center justify-end gap-1">
        <span className="text-emerald-600 font-medium">{count}</span>
        {change !== 0 && (
          <span className={change > 0 ? "text-emerald-500 text-xs" : "text-destructive text-xs"}>
            {change > 0 ? `↗${change}` : `↘${Math.abs(change)}`}
          </span>
        )}
      </div>
    );
  },
}
```

---

## 2. Enable Password Leak Protection

### Thực hiện
Sử dụng công cụ `configure-auth` để bật tính năng Leaked Password Protection trong Auth settings.

Tính năng này sẽ:
- Kiểm tra mật khẩu mới có trong database các mật khẩu bị lộ không
- Ngăn người dùng sử dụng mật khẩu đã bị compromise

---

## 3. Sửa Projects Table Layout (Semrush Style)

### Vấn đề hiện tại
- Header cột "4-10" và "11-30" bị xuống hàng (do width constraint)
- Columns có width cứng nhắc, tạo nhiều khoảng trống
- Alignment không thống nhất

### Giải pháp

**File: `src/components/projects/ProjectsTable.tsx`**

```typescript
// Columns definition với proper alignment
{
  accessorKey: "name",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Name" className="justify-start" />
  ),
  cell: ({ row }) => (
    <Link className="text-left ...">...</Link>  // Căn trái
  ),
},
{
  accessorKey: "domain",
  header: () => <span className="text-right block">Domain</span>,
  cell: ({ row }) => (
    <div className="text-right">
      <DomainWithFavicon ... />
    </div>
  ),
},
{
  id: "classes",
  header: () => <span className="text-right block">Classes</span>,
  cell: ({ row }) => (
    <div className="text-right">...</div>
  ),
},
// ... tương tự cho các cột khác

// Header styling - prevent wrapping
{
  id: "top3",
  header: () => <span className="whitespace-nowrap text-right block">1-3</span>,
  // ...
},
{
  id: "top10", 
  header: () => <span className="whitespace-nowrap text-right block">4-10</span>,
  // ...
},
{
  id: "top30",
  header: () => <span className="whitespace-nowrap text-right block">11-30</span>,
  // ...
},
```

### Table Layout CSS

```typescript
// TableHead className
<TableHead
  key={header.id}
  className={cn(
    "whitespace-nowrap", // Ngăn header xuống hàng
    header.id === "name" ? "text-left" : "text-right", // Name căn trái, còn lại căn phải
    header.id === "select" && "w-10",
    // Bỏ các width constraints cứng nhắc
  )}
>

// TableCell className
<TableCell
  key={cell.id}
  className={cn(
    cell.column.id === "name" ? "text-left" : "text-right",
    // ...responsive classes
  )}
>
```

---

## 4. Sửa Keywords Table Alignment

### Yêu cầu
- Cột Keyword: căn trái (giữ nguyên)
- Tất cả các cột còn lại: căn phải

### Cập nhật

**File: `src/components/projects/KeywordsTable.tsx`**

```typescript
// Header styling
<th 
  className={cn(
    "h-12 px-4 font-medium text-muted-foreground bg-background",
    header.id === "keyword" ? "text-left" : "text-right",
    header.id === "select" && "w-10 text-center",
  )}
>

// Cell styling
<td 
  className={cn(
    "p-4 align-middle",
    cell.column.id === "keyword" ? "text-left" : "text-right",
  )}
>

// Update individual column cells to use text-right
{
  accessorKey: "ranking_position",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Last" className="justify-end" />
  ),
  cell: ({ row }) => (
    <div className="flex items-center justify-end gap-1.5">
      ...
    </div>
  ),
},
// ... tương tự cho First, Best, URL, Updated
```

### Competitor Rows

Đảm bảo các row competitor cũng căn phải:

```typescript
{/* Last (with change indicator) */}
<td className="p-4 align-middle text-right">
  {renderPositionWithChange(...)}
</td>

{/* First */}
<td className="p-4 align-middle text-right text-muted-foreground">
  {firstPos ?? "-"}
</td>
// ... và các cột khác
```

---

## Files cần thay đổi

| File | Thay đổi |
|------|----------|
| **Migration SQL** | Update RPC `get_projects_paginated` thêm 3 cột *_change |
| **Auth Config** | Enable Leaked Password Protection |
| `src/hooks/useProjectsPaginated.ts` | Thêm 3 fields: top3_change, top10_change, top30_change |
| `src/components/projects/ProjectsTable.tsx` | Header whitespace-nowrap, căn phải (trừ Name), trend indicators |
| `src/components/projects/KeywordsTable.tsx` | Header và cell căn phải (trừ Keyword) |

---

## Kết quả mong đợi

### Projects Table
- Header "1-3", "4-10", "11-30" không bị xuống hàng
- Trend indicators hiển thị: `4 ↗2` hoặc `3 ↘1` 
- Tất cả columns căn phải (trừ Name căn trái)
- Columns tự động co giãn theo nội dung, không có khoảng trống thừa

### Keywords Table
- Keyword column căn trái
- Tất cả columns còn lại (Last, First, Best, URL, Updated, Actions) căn phải
- Competitor rows cũng tuân theo alignment này

### Security
- Password Leak Protection được bật
- Người dùng không thể sử dụng mật khẩu đã bị lộ khi đăng ký/đổi mật khẩu

