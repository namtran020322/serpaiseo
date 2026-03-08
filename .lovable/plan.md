

## Plan: Apple Design polish cho ClassDetail, Tabs, và Toggle Columns

### 1. Toggle Columns — đổi tên biến thân thiện hơn (hình 1)

Hiện tại dropdown "Toggle columns" hiển thị raw `column.id` như `ranking_position`, `first_position`, `best_position`, `found_url`, `last_checked_at`. Cần map sang tên đẹp hơn.

**File: `src/components/ui/data-table-toolbar.tsx`**
- Thêm một map `columnLabels` để hiển thị tên thân thiện thay vì `column.id`:
  - `ranking_position` → "Ranking"
  - `first_position` → "First Position"  
  - `best_position` → "Best Position"
  - `found_url` → "URL"
  - `last_checked_at` → "Last Checked"
  - Fallback: capitalize `column.id`

### 2. Ranking History Chart — nền Apple style (hình 2)

Hiện chart dùng `<Card>` mặc định (trắng + border). Cần đổi thành `bg-slate-50 rounded-2xl` không border, không shadow — giống các card Apple đã làm trước.

**File: `src/components/projects/RankingHistoryChart.tsx`**
- Thay `<Card>` bằng `<div className="bg-slate-50 rounded-2xl p-6">` 
- Bỏ `CardHeader`, `CardContent` — dùng div thuần
- Loading state và empty state cũng dùng `bg-slate-50 rounded-2xl`

### 3. Tabs — bo tròn hơn + thêm icon (hình 3 & 4)

Hiện Tabs dùng `rounded-sm` mặc định. Cần bo tròn hơn giống Apple style (hình 4: `rounded-full` cho TabsList, `rounded-full` cho TabsTrigger).

**File: `src/components/ui/tabs.tsx`**
- `TabsList`: đổi `rounded-md` → `rounded-full`, thêm `p-1`
- `TabsTrigger`: đổi `rounded-sm` → `rounded-full`

**File: `src/pages/ClassDetail.tsx` (lines 270-274)**
- Thêm icon cho tabs: `BarChart3` cho Statistics, `TrendingUp` cho Ranking Chart

**File: `src/components/projects/ClassSettingsDialog.tsx` (lines 183-187)**
- Thêm icon: `Settings` cho General, `Search` cho Search Settings, `Users` cho Competitors

**File: `src/pages/Billing.tsx` (lines 344-347)**
- Thêm icon cho Transaction History và Order History tabs

### 4. Search Settings card — bo tròn Apple style (hình 5)

**File: `src/components/projects/ClassSettingsDialog.tsx` (line 262)**
- Đổi `rounded-md bg-muted` → `rounded-2xl bg-slate-50` cho khối read-only search parameters

### Tổng kết files

| File | Change |
|------|--------|
| `data-table-toolbar.tsx` | Map column.id → friendly names trong Toggle columns |
| `RankingHistoryChart.tsx` | Card → div bg-slate-50 rounded-2xl |
| `tabs.tsx` | rounded-md/sm → rounded-full |
| `ClassDetail.tsx` | Thêm icon cho 2 tabs |
| `ClassSettingsDialog.tsx` | Thêm icon cho 3 tabs + rounded-2xl cho search params card |
| `Billing.tsx` | Thêm icon cho 2 tabs |

