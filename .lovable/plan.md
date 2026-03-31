

# Pre-check & Report On Time — Scheduled Ranking

## Tổng quan

Thay vì bắt đầu check đúng giờ user cài (ví dụ 10:00), hệ thống sẽ:
1. **Ước lượng** tổng workload tất cả classes cùng schedule_time
2. **Bắt đầu check sớm** đủ thời gian để hoàn thành trước giờ hẹn
3. **Gửi email báo cáo** đúng giờ user đã cài đặt

```text
Ví dụ: 3 users cùng schedule 10:00, tổng 50 keywords

Hiện tại:
10:00 ─── bắt đầu check ─── 10:08 xong ─── user tự vào xem

Mới:
09:52 ─── bắt đầu check (sớm 8 phút) ─── 10:00 data sẵn sàng + email báo cáo
```

## Thuật toán ước lượng thời gian

- Pipeline throughput: ~1 keyword/6 giây (trung bình 5 pages × 1s delay + overhead)
- process-ranking-queue chạy mỗi phút, xử lý 10 keywords/batch
- Throughput thực tế: ~10 keywords/phút
- Buffer: +30% dự phòng
- Công thức: `start_minutes_before = ceil(total_keywords × 6 / 60 × 1.3)`

| Total keywords | Estimated time | Start trước |
|---|---|---|
| 10 | 1 phút | 2 phút |
| 50 | 5 phút | 7 phút |
| 200 | 20 phút | 26 phút |
| 500 | 50 phút | 65 phút |
| 1000 | 100 phút | 130 phút |

## Thay đổi chi tiết

### Step 1: Migration — Thêm cột `report_at` vào `ranking_check_queue`

```sql
ALTER TABLE ranking_check_queue 
  ADD COLUMN report_at timestamptz,
  ADD COLUMN report_sent boolean DEFAULT false;
```

- `report_at`: thời điểm gửi email báo cáo (= schedule_time của user)
- `report_sent`: đã gửi báo cáo chưa

### Step 2: Thay đổi `scheduled-ranking-check` — Look-ahead scheduling

Thay vì chỉ match `schedule_time === currentTime`, hàm sẽ:

1. Lấy TẤT CẢ classes có schedule (bất kể schedule_time)
2. Nhóm theo `schedule_time` → đếm tổng keywords mỗi nhóm
3. Với mỗi nhóm:
   - Tính `start_minutes_before = ceil(total_keywords × 6 / 60 × 1.3)`
   - Đảm bảo tối thiểu 5 phút
   - Nếu `now >= schedule_time - start_minutes_before` VÀ `now < schedule_time` → bắt đầu queue
   - Nếu `now >= schedule_time` VÀ chưa được queue → cũng queue (fallback, tương thích cũ)
4. Khi tạo job, set `report_at = schedule_time` (Vietnam timezone)

Cron frequency: Tăng từ mỗi giờ lên **mỗi 15 phút** để có granularity tốt hơn cho look-ahead.

### Step 3: Tạo Edge Function `send-scheduled-report`

Function này chạy mỗi phút (piggyback trên pg_cron existing), kiểm tra:
1. Tìm jobs có `report_at <= now()` VÀ `status = 'completed'` VÀ `report_sent = false`
2. Với mỗi job, lấy ranking changes (so sánh `ranking_position` vs `previous_position`)
3. Enqueue email báo cáo vào `email_queue` (dùng `enqueue_email` RPC đã có)
4. Set `report_sent = true`

**Nội dung email báo cáo:**
- Tên class, domain, thời gian check
- Tổng keywords, bao nhiêu tìm thấy
- Top movers: keywords tăng/giảm nhiều nhất (±5 positions)
- Link trực tiếp đến class detail page

**Xử lý edge case:**
- Job chưa xong khi đến `report_at` → vẫn gửi báo cáo với data hiện có, ghi chú "X/Y keywords đã check"
- Job failed → gửi email thông báo lỗi (insufficient credits, etc.)

### Step 4: Setup email infrastructure

Cần scaffold transactional email template cho `ranking-report`. Sử dụng email infrastructure đã có (pgmq queue + process-email-queue).

### Step 5: pg_cron updates

- Thay đổi `scheduled-ranking-check` cron từ mỗi giờ → mỗi 15 phút
- Thêm cron job mới `send-scheduled-report` chạy mỗi phút

## Files thay đổi

| File | Change |
|------|--------|
| Migration SQL | Add `report_at`, `report_sent` columns to `ranking_check_queue` |
| `supabase/functions/scheduled-ranking-check/index.ts` | Look-ahead scheduling algorithm |
| `supabase/functions/send-scheduled-report/index.ts` | New function: check completed jobs & enqueue email |
| Email template | Ranking report email template (via scaffold tool) |
| pg_cron SQL | Update scheduled-ranking-check frequency, add send-scheduled-report cron |

## Giới hạn và lưu ý

- Ước lượng thời gian dựa trên trung bình — workload thực tế có thể dao động
- Nếu workload quá lớn (>2 giờ), hệ thống vẫn bắt đầu sớm nhất có thể nhưng chấp nhận có thể trễ
- Email báo cáo cần transactional email infrastructure được setup đầy đủ (sẽ kiểm tra và scaffold nếu cần)

