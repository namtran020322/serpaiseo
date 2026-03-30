

# Đại trùng tu: Chuyển từ XMLRiver sang RapidAPI Google Search

## Tổng quan
Thay thế core SERP API từ XMLRiver sang RapidAPI `google-search116`, đơn giản hóa credit (1 credit/keyword), bỏ trường `top_results` khỏi UI.

---

## Response Validation & Retry Logic

**Valid response structure** (kể cả khi không có kết quả):
```json
{
  "search_term": "...",
  "knowledge_panel": { ... },
  "results": [],
  "related_keywords": { ... }
}
```

**Validation rule:**
- Response PHẢI có field `results` (array) → valid response, xử lý bình thường (kể cả `results: []`)
- Response KHÔNG có field `results` hoặc không parse được JSON → coi là lỗi → **retry**
- Response có field `error` → lỗi API (invalid country/language) → không retry, throw error
- HTTP status !== 200 → retry

**Retry strategy:**
- Max 3 attempts per page request
- Delay: 1s → 2s → 4s (exponential backoff)
- Nếu hết retry vẫn fail → throw error cho keyword đó, tiếp tục keyword tiếp theo

**Stop conditions cho pagination loop:**
1. `results` array rỗng (`[]`) → dừng, không call page tiếp
2. Không có field `next_page` → dừng
3. Đã đến page 10 → dừng

---

## Các thay đổi chính

### 1. Secret: Thêm `RAPIDAPI_KEY`

### 2. Rewrite `check-project-keywords/index.ts`
- Xóa toàn bộ XMLRiver logic (XML parsing, SERP_API_ERRORS mapping)
- Mới: `fetchSerpPage(keyword, countryCode, langCode, page)` với retry 3 lần
- Validate response: check `results` field exists
- Pagination loop 1→10 với 1s delay, stop khi `results` rỗng hoặc không có `next_page`
- Mobile canonical: check page 1 trước, nếu có diff thì check tiếp các page sau
- Country mapping: `country_id` → ISO code (VN, US...)
- Credit: flat 1 credit/keyword

### 3. Update `add-ranking-job/index.ts`
- Credit calc → `totalKeywords * 1`

### 4. Update `process-ranking-queue/index.ts`
- Credit calc → `keywordCount * 1`

### 5. Update `src/lib/pricing.ts`
- `calculateCreditsNeeded(count)` → `count * 1`

### 6. UI: Remove `topResults` field
- `AddClassDialog.tsx`, `AddProjectDialog.tsx`, `ClassSettingsDialog.tsx`
- Thêm info: "Rankings checked in Top 100 by default"
- Location giữ nguyên UI, không gửi đi API

### 7. Update `useProjects.ts`
- Bỏ `topResults` từ mutations, hardcode 100

### 8. Update i18n (`en.ts`, `vi.ts`)

### 9. Deploy edge functions

---

## Files to modify

| File | Change |
|------|--------|
| `supabase/functions/check-project-keywords/index.ts` | Full rewrite — RapidAPI + retry + canonical |
| `supabase/functions/add-ranking-job/index.ts` | Credit = 1/kw |
| `supabase/functions/process-ranking-queue/index.ts` | Credit = 1/kw |
| `src/lib/pricing.ts` | Simplify |
| `src/components/projects/AddClassDialog.tsx` | Remove topResults |
| `src/components/projects/AddProjectDialog.tsx` | Remove topResults |
| `src/components/projects/ClassSettingsDialog.tsx` | Remove topResults |
| `src/hooks/useProjects.ts` | Remove topResults |
| `src/i18n/en.ts` & `vi.ts` | Update keys |

