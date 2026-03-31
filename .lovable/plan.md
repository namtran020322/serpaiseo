

# Fix: Eliminate Edge Function Timeout — 1 Keyword Per Invocation

## Vấn đề gốc

`process-ranking-queue` gọi `check-project-keywords` với batch 5 keywords và **chờ đồng bộ** (await). Mỗi keyword có thể scan tối đa 10 pages (mỗi page 1s delay + fetch time + canonical fetch). Với 5 keywords × ~40s/keyword = ~200s → **vượt giới hạn 150s** của Deno Edge Function → function bị kill giữa chừng → job kẹt ở `processing` → UI hiển thị "đang chạy" mãi.

`reset_stale_queue_jobs` chỉ chạy sau 10 phút, nên user phải chờ rất lâu.

## Giải pháp: 1 keyword per invocation

Thay vì gọi `check-project-keywords` với batch 5 keywords, `process-ranking-queue` sẽ:
1. Claim job → gửi **1 keyword duy nhất** tới `check-project-keywords`
2. Cập nhật progress (+1)
3. Self-invoke để xử lý keyword tiếp theo

Thời gian tối đa per invocation: ~50s (1 keyword × 10 pages × ~5s/page) — an toàn trong giới hạn 150s.

## Thay đổi cụ thể

### Step 1: `process-ranking-queue/index.ts`
- Đổi `BATCH_SIZE = 5` → `BATCH_SIZE = 1`
- Gửi chỉ 1 keyword ID tới `check-project-keywords`
- Giữ nguyên logic self-invoke sequential

### Step 2: Giảm stale timeout
- Trong `reset_stale_queue_jobs()`: giảm interval từ `10 minutes` → `3 minutes` (vì 1 keyword không nên mất quá 2 phút)
- Trong `claim_next_queue_job()`: giảm interval từ `2 minutes` → `3 minutes` (đồng bộ)

### Step 3: Fix UI — xóa job kẹt hiện tại
- Reset job `50d277b1` bị stuck về `pending` hoặc xóa nó
- UI tự động cập nhật qua Realtime subscription

## Files thay đổi

| File | Change |
|------|--------|
| `supabase/functions/process-ranking-queue/index.ts` | `BATCH_SIZE = 1` |
| Migration SQL | Update `reset_stale_queue_jobs()` interval to 3 min |
| Migration SQL | Update `claim_next_queue_job()` stale interval to 3 min |

## Tại sao giải pháp này triệt để

- 1 keyword/invocation → max ~50s → **không bao giờ timeout**
- Nếu 1 invocation bị crash, chỉ mất 1 keyword, stale reset sau 3 phút tự khôi phục
- Không cần thay đổi `check-project-keywords` — nó vẫn nhận mảng keyword IDs, chỉ là mảng có 1 phần tử

