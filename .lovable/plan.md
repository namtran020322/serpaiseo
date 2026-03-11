

## Nguyên nhân

Email xác thực đang gửi từ `no-reply@auth.lovable.cloud` vì **auth email templates chưa được scaffold**. Hiện tại chỉ có email queue infrastructure (pgmq) được thiết lập cho transactional emails, nhưng **auth-email-hook** edge function chưa tồn tại. Hệ thống vẫn đang dùng email mặc định của Lovable Cloud.

Domain `notify.serp.aiseocore.com` đã verified thành công.

## Kế hoạch

### Step 1: Scaffold auth email templates
- Gọi `scaffold_auth_email_templates` để tạo 6 template (signup, recovery, magic-link, invite, email-change, reauthentication)
- Tự động tạo `supabase/functions/auth-email-hook/` edge function

### Step 2: Apply brand styling
- Đọc `src/index.css` để lấy CSS variables (primary, foreground, etc.)
- Upload logo (`src/assets/logo.webp`) vào email-assets storage bucket
- Cập nhật tất cả templates với màu sắc, logo, và ngôn ngữ phù hợp (tiếng Việt nếu app dùng tiếng Việt)
- Giữ email body background trắng (#ffffff)

### Step 3: Deploy auth-email-hook
- Gọi `deploy_edge_functions` với `auth-email-hook`
- Sau khi deploy, hệ thống tự động chuyển sang dùng custom domain `notify.serp.aiseocore.com`

### Kết quả
Sau khi hoàn tất, tất cả auth emails (xác thực, reset password, magic link) sẽ gửi từ `notify.serp.aiseocore.com` thay vì `auth.lovable.cloud`.

