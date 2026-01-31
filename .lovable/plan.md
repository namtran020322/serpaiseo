

## Kế hoạch Sửa lỗi Logic History Mode - Chỉ hiển thị Keywords có Data

### Vấn đề

Trong `useHistoricalKeywords`, logic hiện tại:

```text
filteredKeywords.map((kw) => {
  const historyRecord = latestByKeyword.get(kw.id);
  return {
    ...
    ranking_position: historyRecord?.ranking_position ?? null,  // fallback null
    last_checked_at: historyRecord?.checked_at ?? kw.updated_at, // fallback hiện tại ← SAI
  };
});
```

**Kết quả:** Keyword không có history vẫn được trả về với `last_checked_at = kw.updated_at` (thời gian hiện tại), gây nhầm lẫn.

### Giải pháp

Thay đổi logic từ **"lấy tất cả keywords, merge với history"** sang **"chỉ lấy keywords có trong history"**:

```text
┌──────────────────────────────────────────────────────────────┐
│  TRƯỚC (SAI)                                                 │
├──────────────────────────────────────────────────────────────┤
│  All Keywords (12) + History Records (10)                    │
│       ↓                                                      │
│  Merge: Keyword có history → lấy history data                │
│         Keyword không có → fallback dữ liệu hiện tại         │
│       ↓                                                      │
│  Result: 12 keywords (2 keywords hiện "xx minutes ago")      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  SAU (ĐÚNG)                                                  │
├──────────────────────────────────────────────────────────────┤
│  History Records (10) + Keyword Base Info                    │
│       ↓                                                      │
│  Filter: Chỉ lấy keywords CÓ history record                  │
│       ↓                                                      │
│  Result: 10 keywords (tất cả có data của ngày đó)            │
└──────────────────────────────────────────────────────────────┘
```

---

### Chi tiết thay đổi

**File:** `src/hooks/useRankingDates.ts`

**Hàm:** `useHistoricalKeywords` (dòng 117-214)

**Logic mới:**

```typescript
// 1. Fetch history records trước
const { data: history, error: historyError } = await supabase
  .from("keyword_ranking_history")
  .select("*")
  .eq("class_id", classId)  // Có thể query trực tiếp nếu có index
  .gte("checked_at", startOfDay)
  .lte("checked_at", endOfDay)
  .order("checked_at", { ascending: false });

// 2. Filter theo exact date và lấy latest per keyword
const latestByKeyword = new Map<string, any>();
(history || [])
  .filter((record) => utcToVnDateString(record.checked_at) === selectedDate)
  .forEach((record) => {
    if (!latestByKeyword.has(record.keyword_id)) {
      latestByKeyword.set(record.keyword_id, record);
    }
  });

// 3. Nếu không có history records nào → trả về empty
if (latestByKeyword.size === 0) {
  return { keywords: [], totalCount: 0 };
}

// 4. Fetch keyword base info CHỈ CHO những keyword có history
const keywordIdsWithHistory = Array.from(latestByKeyword.keys());

const { data: keywords, error: keywordsError } = await supabase
  .from("project_keywords")
  .select("id, keyword, class_id, user_id, created_at, updated_at, serp_results")
  .in("id", keywordIdsWithHistory);

// 5. Apply search filter (nếu có)
let filteredKeywords = keywords || [];
if (search && search.trim()) {
  const searchLower = search.toLowerCase();
  filteredKeywords = filteredKeywords.filter((k) => 
    k.keyword.toLowerCase().includes(searchLower)
  );
}

// 6. Build kết quả - CHỈ keywords có history
const mergedKeywords: HistoricalKeyword[] = filteredKeywords
  .filter((kw) => latestByKeyword.has(kw.id))  // Double-check
  .map((kw) => {
    const historyRecord = latestByKeyword.get(kw.id)!;
    return {
      id: kw.id,
      keyword: kw.keyword,
      ranking_position: historyRecord.ranking_position,
      found_url: historyRecord.found_url,
      competitor_rankings: historyRecord.competitor_rankings,
      first_position: null,
      best_position: null,
      previous_position: null,
      last_checked_at: historyRecord.checked_at,  // Luôn từ history, không fallback
      class_id: kw.class_id,
      user_id: kw.user_id,
      created_at: kw.created_at,
      updated_at: kw.updated_at,
      serp_results: kw.serp_results,
    };
  });

// 7. Apply pagination
const totalCount = mergedKeywords.length;
const from = page * pageSize;
const paginatedKeywords = mergedKeywords.slice(from, from + pageSize);

return {
  keywords: paginatedKeywords,
  totalCount,
};
```

---

### Thay đổi cụ thể trong code

| Dòng | Trước | Sau |
|------|-------|-----|
| 133-142 | Fetch ALL keywords của class trước | Fetch history records trước |
| 153-156 | Filter keywords by search, lấy IDs | Check history empty → return early |
| 161-167 | Query history với keyword IDs | Query keywords CHỈ những có history |
| 182-200 | Map ALL keywords, fallback | Map CHỈ keywords có history, không fallback |
| 193 | `historyRecord?.checked_at ?? kw.updated_at` | `historyRecord.checked_at` (bắt buộc có) |

---

### Kết quả mong đợi

**Trước:**
- User chọn ngày 19/01/2026
- Statistics hiển thị: Total = 10 keywords
- Bảng hiển thị: 12 keywords (2 keywords có "Updated: xx minutes ago")
- **Không nhất quán!**

**Sau:**
- User chọn ngày 19/01/2026  
- Statistics hiển thị: Total = 10 keywords
- Bảng hiển thị: **10 keywords** (tất cả đều có data của ngày 19/01)
- Tất cả Updated column hiển thị thời gian trong ngày 19/01/2026
- **Nhất quán!**

---

### Tóm tắt

| File | Thay đổi |
|------|----------|
| `src/hooks/useRankingDates.ts` | Refactor `useHistoricalKeywords` để chỉ trả về keywords có history record, không fallback |

