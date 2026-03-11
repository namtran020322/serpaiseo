

# Kế hoạch triển khai (đã điều chỉnh)

## 1. Export thêm URL đối thủ trong CSV

**File**: `src/components/projects/ExportButton.tsx`
- Thêm cột `{domain} URL` sau mỗi cột `{domain}` trong header CSV
- Trích xuất `.url` từ `competitor_rankings[domain]` object

---

## 2. Tooltip giải thích (i) icon

**Loại bỏ**: ~~Ranking Stats Cards~~ (theo yêu cầu)

**Tạo component**: `src/components/InfoTooltip.tsx`
- Icon chữ (i) nhỏ, khi hover hiện tooltip giải thích
- Follow phong cách UI ProjectDetail: dùng `bg-muted/50 rounded-2xl`, text `text-sm text-muted-foreground`

**Các vị trí thêm tooltip**:

| Vị trí | File | Label gốc | Tooltip content |
|--------|------|-----------|-----------------|
| Billing - Current Balance | `Billing.tsx` | Current Balance | Số credits còn lại trong tài khoản |
| Billing - Total Purchased | `Billing.tsx` | Total Purchased | Tổng credits đã mua từ trước đến nay |
| Billing - Total Used | `Billing.tsx` | Total Used | Tổng credits đã sử dụng |
| Billing - Credit Usage (50/100) | `Billing.tsx` | Credit Usage section | Giải thích cách tính credits |
| Ranking Distribution | `RankingDistributionChart.tsx` | Ranking Distribution | Biểu đồ phân bố vị trí keywords trên Google |
| Domain Comparison | `TopOverviewTable.tsx` | Domain Comparison | So sánh thứ hạng domain của bạn với đối thủ |
| Classes section | `ProjectDetail.tsx` | Classes desc | Classes giúp nhóm keywords theo tiêu chí riêng |
| Competitor Domains | `ClassDetail.tsx` | Competitor Domains | Các domain đối thủ được theo dõi cùng keywords |
| Ranking History | `RankingHistoryChart.tsx` | Ranking History | Biểu đồ xu hướng thứ hạng keywords theo thời gian |
| Class Settings - Top Results | `ClassSettingsDialog.tsx` | Top Results | Số kết quả SERP cần quét |
| Class Settings - Schedule | `ClassSettingsDialog.tsx` | Schedule | Lịch tự động kiểm tra thứ hạng |
| Class Settings - Device | `ClassSettingsDialog.tsx` | Device | Thiết bị mô phỏng khi kiểm tra |
| Class Settings - Competitors | `ClassSettingsDialog.tsx` | Competitors | Domain đối thủ để so sánh |

**i18n**: Thêm tất cả tooltip keys vào `en.ts` và `vi.ts`

---

## 3. Cloudflare Turnstile CAPTCHA

**Files thay đổi**:
- `index.html`: Thêm Turnstile script tag
- Tạo `src/components/TurnstileCaptcha.tsx`: Wrapper component, render widget, trả token qua callback
- `Register.tsx`, `Login.tsx`, `ForgotPassword.tsx`: Thêm captcha widget trước nút submit, block submit nếu chưa verify
- Tạo Edge Function `verify-turnstile/index.ts`: Verify token server-side với Cloudflare API
- Cần Site Key (public) và Secret Key (secret, lưu qua add_secret tool)

---

## 4. Dashboard Command Center

**File**: `Dashboard.tsx` - thiết kế lại hoàn toàn

**Layout** (follow phong cách ProjectDetail: `bg-muted/50 rounded-2xl` containers, `bg-background rounded-xl` items):

- **Row 1 - Summary Cards** (3 cột): Tổng Projects, Tổng Keywords, Keywords checked hôm nay
- **Row 2 - Two columns**:
  - Left: Ranking Distribution Chart tổng hợp (reuse `RankingDistributionChart` component với data aggregate)
  - Right: Top Movers - keywords tăng/giảm nhiều nhất (so sánh `ranking_position` vs `previous_position`)
- Bỏ phần "How to use", giữ `AnnouncementBanner`

**Hook mới**: `src/hooks/useDashboardStats.ts`
- Query đếm projects, keywords, daily checks từ các bảng hiện có
- Query top movers: keywords có `|ranking_position - previous_position|` lớn nhất

---

## Thứ tự triển khai
1. Export URL đối thủ
2. InfoTooltip + i18n
3. Dashboard Command Center
4. Cloudflare Turnstile (cần Site Key + Secret Key từ bạn)

