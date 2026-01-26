

## Kế hoạch Cải thiện Tables Alignment và Date Range Picker

### Tổng quan

| # | Nhiệm vụ | Loại |
|---|----------|------|
| 1 | Sửa căn lề Projects Table theo Semrush style | Frontend |
| 2 | Sửa căn lề Keywords Table theo Semrush style | Frontend |
| 3 | Thêm Date Range Picker với dữ liệu từ database | Frontend + Hook |

---

## 1. Sửa căn lề Tables (Semrush Style)

### Nguyên tắc căn lề mới

Dựa trên hình ảnh Semrush:
- **Tất cả columns**: Phân bổ không gian linh động, không có width cứng
- **Nội dung bên trong (header name + cell content)**: Tất cả căn trái
- **Ngoại trừ**: Cột Select (checkbox) căn giữa

### Thay đổi

**File: `src/components/projects/ProjectsTable.tsx`**

Trước:
```typescript
// Header căn phải
header: () => <span className="block text-right">Domain</span>,
// Cell căn phải
cell: ({ row }) => <div className="flex justify-end">...</div>
```

Sau:
```typescript
// Tất cả headers căn trái
header: () => <span className="block">Domain</span>,
// Tất cả cells căn trái
cell: ({ row }) => <div className="flex justify-start">...</div>
```

Thay đổi tương tự cho tất cả columns:
- `domain`: Bỏ `text-right`, `justify-end`
- `classes`: Bỏ `text-right`
- `keywords`: Bỏ `text-right`
- `top3/top10/top30`: Bỏ `justify-end`
- `updated_at`: Bỏ `text-right`

TableHead và TableCell:
```typescript
<TableHead
  className={cn(
    "whitespace-nowrap",
    header.id === "select" ? "w-10 text-center" : "text-left",
    // ... responsive classes
  )}
>

<TableCell
  className={cn(
    cell.column.id === "select" ? "text-center" : "text-left",
    // ... responsive classes
  )}
>
```

**File: `src/components/projects/KeywordsTable.tsx`**

Áp dụng tương tự:
- Tất cả headers: `text-left` (trừ Select: `text-center`)
- Tất cả cells: nội dung căn trái
- Columns: `ranking_position`, `first_position`, `best_position`, `found_url`, `last_checked_at`, `actions` - tất cả đổi sang căn trái
- Competitor rows: cũng căn trái toàn bộ

---

## 2. Date Range Picker

### Components mới

**File: `src/components/projects/HistoryDatePicker.tsx`**

Component DatePicker sử dụng Shadcn UI Popover + Calendar:

```typescript
interface HistoryDatePickerProps {
  classId: string;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

export function HistoryDatePicker({ classId, selectedDate, onDateSelect }: HistoryDatePickerProps) {
  // Hook lấy danh sách ngày có data từ keyword_ranking_history
  const { data: datesWithData = [] } = useRankingDates(classId);
  
  // Custom day rendering
  const modifiers = {
    hasData: datesWithData.map(d => new Date(d)),
  };
  
  const modifiersClassNames = {
    hasData: 'bg-blue-100 relative', // Light blue background
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Today'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        {/* Legend */}
        <div className="p-3 pb-0 flex items-center gap-4 text-sm border-b">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span>Has data</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-muted rounded-full" />
            <span>No data</span>
          </div>
        </div>
        
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className="pointer-events-auto"
          components={{
            DayContent: ({ date }) => {
              const hasData = datesWithData.some(d => 
                format(new Date(d), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
              );
              return (
                <div className="relative">
                  <span>{date.getDate()}</span>
                  {hasData && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </div>
              );
            },
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
```

### Hook lấy ngày có dữ liệu

**File: `src/hooks/useRankingDates.ts`**

```typescript
export function useRankingDates(classId: string | undefined) {
  const { user } = useAuthContext();
  
  return useQuery({
    queryKey: ['ranking-dates', classId, user?.id],
    queryFn: async () => {
      if (!classId || !user) return [];
      
      // Lấy keyword IDs của class này
      const { data: keywords } = await supabase
        .from('project_keywords')
        .select('id')
        .eq('class_id', classId);
      
      if (!keywords || keywords.length === 0) return [];
      
      const keywordIds = keywords.map(k => k.id);
      
      // Lấy distinct dates từ keyword_ranking_history
      const { data: history } = await supabase
        .from('keyword_ranking_history')
        .select('checked_at')
        .in('keyword_id', keywordIds)
        .order('checked_at', { ascending: false });
      
      if (!history) return [];
      
      // Extract unique dates (chỉ lấy ngày, bỏ giờ)
      const uniqueDates = [...new Set(
        history.map(h => format(new Date(h.checked_at), 'yyyy-MM-dd'))
      )];
      
      return uniqueDates;
    },
    enabled: !!classId && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Hook lấy keywords theo ngày

**File: `src/hooks/useKeywordsOnDate.ts`**

```typescript
export function useKeywordsOnDate(classId: string, date: Date | undefined) {
  const { user } = useAuthContext();
  
  return useQuery({
    queryKey: ['keywords-on-date', classId, date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!classId || !user || !date) return null;
      
      const dateStart = startOfDay(date);
      const dateEnd = endOfDay(date);
      
      // Lấy snapshot ranking của ngày đó từ keyword_ranking_history
      const { data: keywords } = await supabase
        .from('project_keywords')
        .select('id, keyword')
        .eq('class_id', classId);
      
      if (!keywords) return [];
      
      const keywordIds = keywords.map(k => k.id);
      
      // Lấy ranking cuối cùng của mỗi keyword trong ngày đó
      const { data: history } = await supabase
        .from('keyword_ranking_history')
        .select('keyword_id, ranking_position, found_url, competitor_rankings, checked_at')
        .in('keyword_id', keywordIds)
        .gte('checked_at', dateStart.toISOString())
        .lte('checked_at', dateEnd.toISOString())
        .order('checked_at', { ascending: false });
      
      if (!history) return [];
      
      // Merge với keyword info, lấy record cuối cùng của mỗi keyword
      const latestByKeyword = new Map();
      history.forEach(h => {
        if (!latestByKeyword.has(h.keyword_id)) {
          latestByKeyword.set(h.keyword_id, h);
        }
      });
      
      return keywords.map(k => {
        const historyData = latestByKeyword.get(k.id);
        return {
          id: k.id,
          keyword: k.keyword,
          ranking_position: historyData?.ranking_position ?? null,
          found_url: historyData?.found_url ?? null,
          competitor_rankings: historyData?.competitor_rankings ?? {},
          // ...
        };
      });
    },
    enabled: !!classId && !!user && !!date,
    staleTime: 60 * 1000, // 1 minute
  });
}
```

### Cập nhật ClassDetail.tsx

Thêm DatePicker vào header, giữa Settings và Refresh:

```typescript
// State
const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

// Trong header actions
<div className="flex gap-2">
  <ExportButton projectClass={projectClassForExport} />
  <Button variant="outline" onClick={() => setSettingsOpen(true)}>
    <Settings className="mr-2 h-4 w-4" />
    Settings
  </Button>
  
  {/* NEW: Date Picker */}
  <HistoryDatePicker 
    classId={classId!}
    selectedDate={selectedDate}
    onDateSelect={(date) => {
      setSelectedDate(date);
      // Khi chọn ngày, sẽ fetch data từ history thay vì current
    }}
  />
  
  <Button onClick={handleRefresh} disabled={addRankingJob.isPending}>
    <RefreshCw className={`mr-2 h-4 w-4 ${addRankingJob.isPending ? "animate-spin" : ""}`} />
    {addRankingJob.isPending ? "Starting..." : "Refresh Rankings"}
  </Button>
</div>
```

---

## Files cần thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/projects/ProjectsTable.tsx` | Đổi tất cả columns sang căn trái |
| `src/components/projects/KeywordsTable.tsx` | Đổi tất cả columns sang căn trái |
| `src/components/projects/HistoryDatePicker.tsx` | **NEW** - Component DatePicker với custom styling |
| `src/hooks/useRankingDates.ts` | **NEW** - Hook lấy danh sách ngày có data |
| `src/pages/ClassDetail.tsx` | Thêm state selectedDate + HistoryDatePicker component |

---

## Kết quả mong đợi

### Tables
- Tất cả columns có nội dung căn trái (như Semrush)
- Headers không bị xuống hàng (whitespace-nowrap)
- Columns phân bổ linh động theo nội dung

### Date Range Picker
- Vị trí: giữa "Settings" và "Refresh Rankings"
- Calendar hiển thị với:
  - Ngày có data: nền xanh nhạt + chấm tròn xanh bên dưới
  - Legend giải thích ý nghĩa
- Chọn ngày → hiển thị ranking snapshot của ngày đó từ history

