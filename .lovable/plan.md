

## Kế hoạch Tổng hợp - 5 Tính năng Cải thiện

### Tổng quan các nhiệm vụ

| # | Nhiệm vụ | Loại |
|---|----------|------|
| 1 | Xác nhận daily_usage_summary hoạt động đúng | Verification |
| 2 | Thêm cron job cleanup_old_usage_transactions | Database |
| 3 | Sửa thứ tự sắp xếp Transaction History | Frontend |
| 4 | Thêm 3 cột Top ranking vào Projects table | Database + Frontend |
| 5 | Cải thiện KeywordsTable (keyword truncate + URL click) | Frontend |

---

## 1. Xác nhận daily_usage_summary hoạt động

**Trạng thái:** Verified - Dữ liệu đã được ghi đúng

Query xác nhận cho thấy bảng đang hoạt động tốt:
- Ngày 25/01/2026: 4 keywords, 12 credits, 1 check
- Ngày 24/01/2026: 18 keywords, 54 credits, 6 checks
- Logic UPSERT đang gom đúng theo ngày

---

## 2. Thêm Cron Job Cleanup

**File: Database Migration**

Sử dụng `pg_cron` để tự động chạy `cleanup_old_usage_transactions()` hàng ngày lúc 3:00 AM.

```sql
-- Tạo cron job xóa usage transactions cũ hơn 7 ngày
SELECT cron.schedule(
  'cleanup-old-usage-transactions',
  '0 3 * * *', -- Mỗi ngày lúc 3:00 AM UTC
  $$SELECT cleanup_old_usage_transactions()$$
);
```

---

## 3. Sửa Thứ tự Sắp xếp Transaction History

**Vấn đề:** 
Nhìn vào ảnh, thứ tự hiện tại là: Purchase trước, Usage sau - không sắp xếp theo ngày chung.

**Giải pháp:**
Gom tất cả transactions (purchase + usage) vào một mảng duy nhất và sort theo ngày giảm dần.

**File: `src/pages/Billing.tsx`**

```typescript
// Merge purchase transactions và daily summary, sort theo ngày
const allTransactions = useMemo(() => {
  const purchaseItems = purchaseTransactions.map(tx => ({
    type: 'purchase' as const,
    date: new Date(tx.created_at),
    data: tx,
  }));
  
  const usageItems = dailySummary.map(day => ({
    type: 'usage' as const,
    date: new Date(day.usage_date),
    data: day,
  }));
  
  return [...purchaseItems, ...usageItems].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
}, [purchaseTransactions, dailySummary]);
```

Sau đó render dựa trên `type` của mỗi item.

---

## 4. Thêm 3 Cột Top Ranking vào Projects Table

### 4.1 Cập nhật Database RPC

**File: Database Migration - Update `get_projects_paginated`**

```sql
CREATE OR REPLACE FUNCTION get_projects_paginated(...)
RETURNS jsonb
AS $$
...
  SELECT 
    pr.id, pr.name, pr.domain, pr.created_at, pr.updated_at,
    (SELECT COUNT(*)::integer FROM project_classes WHERE project_id = pr.id) as class_count,
    (SELECT COUNT(*)::integer FROM project_keywords pk 
     JOIN project_classes pc ON pk.class_id = pc.id 
     WHERE pc.project_id = pr.id) as keyword_count,
    -- New: Top ranking counts
    (SELECT COUNT(*)::integer FROM project_keywords pk 
     JOIN project_classes pc ON pk.class_id = pc.id 
     WHERE pc.project_id = pr.id 
       AND pk.ranking_position IS NOT NULL 
       AND pk.ranking_position <= 3) as top3_count,
    (SELECT COUNT(*)::integer FROM project_keywords pk 
     JOIN project_classes pc ON pk.class_id = pc.id 
     WHERE pc.project_id = pr.id 
       AND pk.ranking_position IS NOT NULL 
       AND pk.ranking_position > 3 
       AND pk.ranking_position <= 10) as top10_count,
    (SELECT COUNT(*)::integer FROM project_keywords pk 
     JOIN project_classes pc ON pk.class_id = pc.id 
     WHERE pc.project_id = pr.id 
       AND pk.ranking_position IS NOT NULL 
       AND pk.ranking_position > 10 
       AND pk.ranking_position <= 30) as top30_count
  FROM projects pr
  ...
$$;
```

### 4.2 Update Interface

**File: `src/hooks/useProjectsPaginated.ts`**

```typescript
export interface PaginatedProject {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  updated_at: string;
  class_count: number;
  keyword_count: number;
  // New fields
  top3_count: number;
  top10_count: number;
  top30_count: number;
}
```

### 4.3 Add Columns to Table

**File: `src/components/projects/ProjectsTable.tsx`**

Thêm 3 cột mới sau cột Keywords:

```typescript
{
  id: "top3",
  header: "1-3",
  cell: ({ row }) => (
    <span className="text-emerald-600 font-medium">
      {row.original.top3_count || 0}
    </span>
  ),
},
{
  id: "top10",
  header: "4-10", 
  cell: ({ row }) => (
    <span className="text-blue-600 font-medium">
      {row.original.top10_count || 0}
    </span>
  ),
},
{
  id: "top30",
  header: "11-30",
  cell: ({ row }) => (
    <span className="text-amber-600 font-medium">
      {row.original.top30_count || 0}
    </span>
  ),
},
```

---

## 5. Cải thiện KeywordsTable

### 5.1 Keyword Truncate với Fade Effect

**File: `src/components/projects/KeywordsTable.tsx`**

Thêm CSS cho fade effect và Tooltip để xem full keyword:

```typescript
cell: ({ row }) => {
  const keyword = row.getValue("keyword") as string;
  const hasCompetitors = competitorDomains.length > 0;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span 
          className={cn(
            "font-medium block max-w-[200px] truncate",
            "relative after:absolute after:right-0 after:top-0 after:h-full after:w-8",
            "after:bg-gradient-to-l after:from-background after:to-transparent",
            keyword.length > 30 && "after:opacity-100",
            keyword.length <= 30 && "after:opacity-0",
            hasCompetitors && 'cursor-pointer hover:text-primary hover:underline'
          )}
          onClick={() => hasCompetitors && row.toggleExpanded()}
        >
          {keyword}
        </span>
      </TooltipTrigger>
      {keyword.length > 30 && (
        <TooltipContent>
          <p className="max-w-[400px] break-words">{keyword}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
```

### 5.2 URL Click Actions

**Single click:** Copy full URL to clipboard
**Double click:** Open URL in new tab

```typescript
cell: ({ row }) => {
  const url = row.getValue("found_url") as string | null;
  const fullUrl = url?.startsWith("http") ? url : `https://${url}`;
  
  const handleClick = () => {
    if (!url) return;
    navigator.clipboard.writeText(fullUrl);
    toast({ description: "URL copied to clipboard" });
  };
  
  const handleDoubleClick = () => {
    if (!url) return;
    window.open(fullUrl, "_blank");
  };
  
  return (
    <span 
      className="text-sm text-muted-foreground truncate block max-w-[400px] cursor-pointer hover:text-primary"
      title={`Click: Copy | Double-click: Open | ${url}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {extractSlug(url)}
    </span>
  );
}
```

---

## Files cần thay đổi

| File | Thay đổi |
|------|----------|
| **Migration SQL** | Thêm cron job cleanup + Update RPC get_projects_paginated |
| `src/pages/Billing.tsx` | Merge và sort transactions theo ngày |
| `src/hooks/useProjectsPaginated.ts` | Thêm 3 fields: top3_count, top10_count, top30_count |
| `src/components/projects/ProjectsTable.tsx` | Thêm 3 cột ranking stats |
| `src/components/projects/KeywordsTable.tsx` | Truncate keyword + URL click actions |

---

## Kết quả mong đợi

1. **Daily usage summary** - Confirmed working
2. **Auto cleanup** - Transactions type='usage' cũ hơn 7 ngày tự động bị xóa mỗi ngày
3. **Transaction History** - Sắp xếp theo ngày (mới nhất trước), không tách biệt Purchase/Usage
4. **Projects Table** - Hiển thị 3 cột: 1-3 (emerald), 4-10 (blue), 11-30 (amber)
5. **KeywordsTable** - Keyword dài mờ dần + hover xem full | URL single-click copy, double-click open

