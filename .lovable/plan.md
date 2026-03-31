

# Fix Rate Limit & Mobile Canonical

## Vấn đề 1: Rate limit 1 req/s chưa đảm bảo

**Hiện trạng:** Delay 1s chỉ áp dụng giữa các **page** của cùng 1 keyword. Giữa các **keyword** không có delay. Khi keyword A kết thúc (ví dụ page 7), keyword B bắt đầu ngay lập tức — vi phạm rate limit.

Ngoài ra, `process-ranking-queue` self-invoke ngay lập tức (fire-and-forget), có thể tạo ra nhiều invocation song song, mỗi cái gọi `check-project-keywords` → nhiều API call đồng thời.

**Fix:**
- Thêm `await delay(1000)` trước mỗi keyword (trừ keyword đầu tiên trong batch) trong `processKeywordsSequentially`
- Trong `process-ranking-queue`: **không** self-invoke ngay mà đợi `check-project-keywords` trả về xong rồi mới self-invoke. Vì `check-project-keywords` đã xử lý tuần tự bên trong, nên chỉ cần đảm bảo không có 2 invocation song song gọi API cùng lúc. Cơ chế `claim_next_queue_job` với `FOR UPDATE SKIP LOCKED` đã đảm bảo không có 2 worker claim cùng 1 job, nhưng 2 worker CÓ THỂ claim 2 job khác nhau và gọi API song song → vi phạm global rate limit.
- **Giải pháp gốc**: Giảm BATCH_SIZE từ 10 xuống **1** keyword per invocation trong `process-ranking-queue`, và thêm delay 1s trong self-invoke. Như vậy mỗi lần chỉ có 1 keyword được xử lý, đảm bảo global 1 req/s.

**Tuy nhiên**, nếu BATCH_SIZE = 1 thì mỗi keyword cần 1-10 API calls (1-10 pages), mỗi call cách nhau 1s. Self-invoke cần đợi xong keyword hiện tại rồi mới tiếp. Cách tốt nhất:
- Giữ BATCH_SIZE = 10 nhưng `check-project-keywords` đã có delay 1s giữa pages
- Thêm delay 1s giữa keywords trong `check-project-keywords`  
- Đảm bảo chỉ có **1 worker** chạy tại 1 thời điểm bằng cách self-invoke tuần tự (await xong rồi mới invoke tiếp, không fire-and-forget)

## Vấn đề 2: Mobile canonical không hoạt động đúng

**Hiện trạng:** Logic `applyMobileCanonical` so sánh `canonical !== result.url` bằng string exact match. Vấn đề:
- URL có trailing slash vs không: `https://example.com/page` vs `https://example.com/page/`
- `www` vs non-www: `https://www.example.com` vs `https://example.com`
- HTTP vs HTTPS
- Các redirect chain khiến canonical URL format khác original

Kết quả: page 1 check thấy "không có sự khác biệt" (vì so sánh quá strict) → bỏ qua các page còn lại → miss canonical URLs.

**Fix:**
- Normalize cả `canonical` và `result.url` trước khi so sánh: bỏ protocol, bỏ www, bỏ trailing slash, lowercase
- Chỉ khi normalized URLs khác nhau thì mới coi là "có sự khác biệt"
- Khi apply canonical, vẫn dùng canonical URL gốc (không normalize) để lưu vào DB

## Files thay đổi

| File | Change |
|------|--------|
| `supabase/functions/check-project-keywords/index.ts` | Add 1s delay between keywords; fix canonical URL comparison with normalization |
| `supabase/functions/process-ranking-queue/index.ts` | Change self-invoke from fire-and-forget to sequential (await response trước khi invoke tiếp) |

