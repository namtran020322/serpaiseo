

# Plan: Concurrent Staggered SERP Requests (1 req/s Pipeline)

## Vấn đề hiện tại

Hiện tại hệ thống xử lý **tuần tự**: gửi request → **đợi response** (2-5s) → delay 1s → gửi request tiếp. Thực tế throughput chỉ ~0.2-0.3 req/s thay vì 1 req/s theo rate limit cho phép.

Self-invoke giữa các keyword cũng không hoạt động đáng tin cậy trong Deno Edge Functions.

## Giải pháp: Request Pipeline trong check-project-keywords

Thay vì đợi response rồi mới gửi request tiếp, tạo một **global request scheduler** fire đúng 1 request mỗi giây, xử lý response khi nào nó về.

```text
Timeline (current - sequential):
t=0  [KW1-P1 send]----[wait 3s]----[KW1-P1 done] [1s delay] [KW1-P2 send]...
Throughput: ~0.25 req/s

Timeline (new - pipelined):  
t=0  [KW1-P1 send]
t=1  [KW1-P2 send]  ← KW1-P1 response chưa về cũng không sao
t=2  [KW1-P3 send]
t=3  [KW2-P1 send]  ← KW1 xong ở page 3 (no next_page)
t=4  [KW2-P2 send]
...
Throughput: 1 req/s
```

### Cách hoạt động

1. **Request Queue**: Một mảng chứa các pending request tasks `{ keyword, page, resolve }`
2. **Scheduler loop**: Mỗi 1 giây, lấy task tiếp theo từ queue và fire request (không await response)
3. **Dynamic page discovery**: Khi response page N về → nếu có `next_page` → push page N+1 vào queue. Nếu không → keyword đó xong.
4. **Completion**: Khi tất cả keyword đã xong (không còn pending requests và không còn in-flight requests) → save kết quả vào DB

### Capacity per invocation

- 150s timeout, buffer 20s → **~130 requests** per invocation
- 10 keywords × 10 pages = 100 requests → hoàn thành trong ~100s
- Nếu nhiều hơn 130 requests → dừng lại, cập nhật progress, pg_cron sẽ pick up tiếp

## Thay đổi cụ thể

### Step 1: `check-project-keywords/index.ts`
- Thay `fetchAllSerpResults()` (sequential per keyword) bằng `PipelinedSerpFetcher` class
- Pipeline nhận danh sách keywords, fire 1 request/s, tự động enqueue next page khi có `next_page`
- Trả về `Map<keywordId, SerpResult[]>` khi tất cả xong hoặc hết budget (130 requests)
- Giữ nguyên logic canonical check sau khi có kết quả

### Step 2: `process-ranking-queue/index.ts`
- Tăng `BATCH_SIZE` lên **10** (vì pipeline xử lý nhanh hơn nhiều)
- **Bỏ self-invoke** hoàn toàn — dựa vào pg_cron mỗi phút
- Đơn giản hóa: claim job → gửi batch → cập nhật progress → return

### Step 3: pg_cron
- Giữ nguyên cron mỗi phút gọi `process-ranking-queue`
- Với 10 keywords/batch × 1 req/s, mỗi batch mất ~100s → cron 1 phút là đủ overlap

## Ví dụ throughput

| Keywords | Pages avg | Total requests | Thời gian | Fits 150s? |
|----------|-----------|---------------|-----------|------------|
| 5        | 5         | 25            | ~25s      | Yes |
| 10       | 10        | 100           | ~100s     | Yes |
| 10       | 5         | 50            | ~50s      | Yes |

## Files thay đổi

| File | Change |
|------|--------|
| `supabase/functions/check-project-keywords/index.ts` | Replace sequential processing with pipelined 1 req/s scheduler |
| `supabase/functions/process-ranking-queue/index.ts` | BATCH_SIZE=10, remove self-invoke, rely on pg_cron |

