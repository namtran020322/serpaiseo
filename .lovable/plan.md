

## Kế hoạch Sửa lỗi Timezone và Thêm Historical Stats cho History Date Picker

### Phân tích Nguyên nhân Lỗi

**Vấn đề Timezone:**

Database lưu timestamps theo UTC (+00), nhưng user ở Vietnam (+07:00). Khi user chọn ngày `2026-01-31`:
- Query hiện tại: `2026-01-31T00:00:00.000Z` đến `2026-01-31T23:59:59.999Z` (UTC)
- Record thực tế: `2026-01-30 18:18:16+00` (= `2026-01-31 01:18:16` Vietnam time)
- **Kết quả: Không match!**

```text
Timeline (UTC):
Jan 30 18:00 ─────────── Jan 31 00:00 ─────────── Jan 31 23:59
      │                        │                        │
      │ Record saved here      │←── Query starts ───────│
      │ (2026-01-30 18:18 UTC) │    (2026-01-31 00:00 UTC)
      │                        │
      │ But this is Jan 31     │
      │ in Vietnam timezone!   │
```

**Vấn đề RankingStatsCards:**
- Hiện tại chỉ dùng RPC `get_class_ranking_stats` query từ `project_keywords` (data hiện tại)
- Không có logic tính stats từ `keyword_ranking_history` khi view history

---

### Giải pháp Tổng thể

| # | Thay đổi | File |
|---|----------|------|
| 1 | Helper functions cho timezone-aware date handling | `src/hooks/useRankingDates.ts` |
| 2 | Fix `useRankingDates` - extract dates theo Vietnam timezone | `src/hooks/useRankingDates.ts` |
| 3 | Fix `useHistoricalKeywords` - query với fallback ±12h | `src/hooks/useRankingDates.ts` |
| 4 | Thêm hook `useHistoricalStats` - tính stats từ history | `src/hooks/useRankingDates.ts` |
| 5 | Update ClassDetail - sử dụng historical stats | `src/pages/ClassDetail.tsx` |
| 6 | Update RankingStatsCards - hiển thị indicator ngày | `src/components/projects/RankingStatsCards.tsx` |

---

## Chi tiết Implementation

### 1. Helper Functions cho Timezone (useRankingDates.ts)

Thêm các helper functions để xử lý timezone consistently:

```typescript
// Vietnam timezone offset: +07:00
const VN_OFFSET_HOURS = 7;

/**
 * Convert UTC timestamp to Vietnam date string (yyyy-MM-dd)
 * This ensures dates are extracted based on Vietnam timezone
 */
function utcToVnDateString(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  // Add 7 hours to get Vietnam time
  const vnDate = new Date(date.getTime() + VN_OFFSET_HOURS * 60 * 60 * 1000);
  const year = vnDate.getUTCFullYear();
  const month = String(vnDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vnDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a local date string (yyyy-MM-dd) and return UTC range for querying
 * with fallback buffer of ±12 hours to handle timezone edge cases
 */
function getDateRangeForQuery(dateStr: string): { start: string; end: string } {
  // Parse as local date components
  const [year, month, day] = dateStr.split("-").map(Number);
  
  // Create date at start of day in Vietnam timezone
  // Vietnam is UTC+7, so start of day in VN = previous day 17:00 UTC
  const vnStartOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const utcStart = new Date(vnStartOfDay.getTime() - VN_OFFSET_HOURS * 60 * 60 * 1000);
  
  // End of day in VN = same day 16:59:59 UTC
  const vnEndOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  const utcEnd = new Date(vnEndOfDay.getTime() - VN_OFFSET_HOURS * 60 * 60 * 1000);
  
  // Add ±12 hour fallback buffer
  const startWithBuffer = new Date(utcStart.getTime() - 12 * 60 * 60 * 1000);
  const endWithBuffer = new Date(utcEnd.getTime() + 12 * 60 * 60 * 1000);
  
  return {
    start: startWithBuffer.toISOString(),
    end: endWithBuffer.toISOString(),
  };
}
```

---

### 2. Fix `useRankingDates` - Extract Dates theo Vietnam Timezone

**Thay đổi logic extract unique dates:**

```typescript
// Trước (lỗi):
const date = format(parseISO(record.checked_at), "yyyy-MM-dd");

// Sau (đúng):
const date = utcToVnDateString(record.checked_at);
```

---

### 3. Fix `useHistoricalKeywords` - Query với Timezone-aware Range

**Thay đổi logic tạo date range:**

```typescript
// Trước (lỗi):
const startOfDay = `${selectedDate}T00:00:00.000Z`;
const endOfDay = `${selectedDate}T23:59:59.999Z`;

// Sau (đúng):
const { start: startOfDay, end: endOfDay } = getDateRangeForQuery(selectedDate);
```

**Thêm logic filter chính xác sau khi fetch (vì dùng buffer ±12h):**

```typescript
// Filter records that actually belong to the selected date (Vietnam timezone)
const recordsForDate = (history || []).filter((record) => {
  const recordDateVn = utcToVnDateString(record.checked_at);
  return recordDateVn === selectedDate;
});
```

---

### 4. Hook mới: `useHistoricalStats`

Thêm hook tính toán stats từ historical data:

```typescript
export interface HistoricalRankingStats {
  top3: number;
  top10: number;
  top30: number;
  top100: number;
  notFound: number;
  total: number;
}

export function useHistoricalStats(
  classId: string | undefined,
  selectedDate: string | undefined // format: yyyy-MM-dd
) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["historical-stats", classId, selectedDate, user?.id],
    queryFn: async (): Promise<HistoricalRankingStats> => {
      if (!user || !classId || !selectedDate) {
        return { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 };
      }

      // Get keyword IDs for this class
      const { data: keywords, error: keywordsError } = await supabase
        .from("project_keywords")
        .select("id")
        .eq("class_id", classId);

      if (keywordsError) throw keywordsError;
      if (!keywords || keywords.length === 0) {
        return { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 };
      }

      const keywordIds = keywords.map((k) => k.id);
      const { start, end } = getDateRangeForQuery(selectedDate);

      // Fetch history with buffer
      const { data: history, error: historyError } = await supabase
        .from("keyword_ranking_history")
        .select("keyword_id, ranking_position, checked_at")
        .in("keyword_id", keywordIds)
        .gte("checked_at", start)
        .lte("checked_at", end);

      if (historyError) throw historyError;

      // Filter to exact date and group by keyword (latest record per keyword)
      const latestByKeyword = new Map<string, number | null>();
      
      (history || [])
        .filter((r) => utcToVnDateString(r.checked_at) === selectedDate)
        .sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime())
        .forEach((record) => {
          if (!latestByKeyword.has(record.keyword_id)) {
            latestByKeyword.set(record.keyword_id, record.ranking_position);
          }
        });

      // Calculate stats
      let top3 = 0, top10 = 0, top30 = 0, top100 = 0, notFound = 0;
      
      latestByKeyword.forEach((position) => {
        if (position === null || position > 100) {
          notFound++;
        } else if (position <= 3) {
          top3++;
        } else if (position <= 10) {
          top10++;
        } else if (position <= 30) {
          top30++;
        } else {
          top100++;
        }
      });

      return {
        top3,
        top10,
        top30,
        top100,
        notFound,
        total: latestByKeyword.size,
      };
    },
    enabled: !!user && !!classId && !!selectedDate,
    staleTime: 60 * 1000,
  });
}
```

---

### 5. Update ClassDetail.tsx

**Thêm import và sử dụng useHistoricalStats:**

```typescript
import { useRankingDates, useHistoricalKeywords, useHistoricalStats } from "@/hooks/useRankingDates";

// Inside component:
// Fetch historical stats when date is selected
const { data: historicalStats } = useHistoricalStats(classId, selectedDateStr);

// Determine which stats to display
const displayStats = isViewingHistory && historicalStats 
  ? historicalStats 
  : (rankingStats || { top3: 0, top10: 0, top30: 0, top100: 0, notFound: 0, total: 0 });
```

**Truyền thêm props cho RankingStatsCards:**

```tsx
<RankingStatsCards 
  stats={displayStats}
  activeTier={tierFilter}
  onTierClick={isViewingHistory ? undefined : handleTierClick}
  historyDate={selectedHistoryDate}
/>
```

**Disable tier filter khi viewing history** (vì historical data không support server-side tier filter):

```tsx
onTierClick={isViewingHistory ? undefined : handleTierClick}
```

---

### 6. Update RankingStatsCards.tsx

**Thêm props và indicator:**

```typescript
interface RankingStatsCardsProps {
  stats: RankingStats;
  activeTier?: string | null;
  onTierClick?: (tier: string | null) => void;
  historyDate?: Date; // NEW: để hiển thị indicator
}
```

**Thêm header với date indicator:**

```tsx
export function RankingStatsCards({ stats, activeTier, onTierClick, historyDate }: RankingStatsCardsProps) {
  // ...existing code...

  return (
    <div className="space-y-3">
      {/* Header với date indicator */}
      {historyDate && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Viewing statistics for
          </span>
          <Badge variant="secondary">
            {format(historyDate, "dd/MM/yyyy")}
          </Badge>
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {/* ...existing cards... */}
      </div>
    </div>
  );
}
```

**Ẩn trend indicators khi viewing history** (vì không có dữ liệu improved/declined cho historical):

```tsx
{/* Row 3: Trend indicators (only for current data) */}
{!isTotal && !historyDate && (
  <div className="flex items-center gap-3 text-xs">
    {/* ...trend indicators... */}
  </div>
)}
```

---

### Kết quả mong đợi

**Timezone Fix:**
- Dates được extract và hiển thị theo Vietnam timezone (+07:00)
- Query sử dụng range với buffer ±12h để không bỏ sót data
- Filter chính xác theo ngày sau khi fetch

**Historical Stats:**
- RankingStatsCards cập nhật theo ngày được chọn
- Hiển thị badge "Viewing statistics for dd/MM/yyyy"
- Ẩn trend indicators (↗↘) khi xem history
- Disable tier click khi xem history

**Data Flow:**

```text
User chọn ngày 31/01/2026
         ↓
Query với buffer: 30/01 05:00 UTC → 01/02 11:59 UTC
         ↓
Filter kết quả: chỉ lấy records có VN date = 31/01/2026
         ↓
├── KeywordsTable: hiển thị ranking history
└── RankingStatsCards: tính toán từ history data
         ↓
User thấy data chính xác của ngày 31/01/2026
```

---

### Files cần thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useRankingDates.ts` | Thêm helpers, fix timezone logic, thêm `useHistoricalStats` |
| `src/pages/ClassDetail.tsx` | Sử dụng `useHistoricalStats`, truyền `historyDate` prop |
| `src/components/projects/RankingStatsCards.tsx` | Thêm `historyDate` prop, hiển thị indicator |

