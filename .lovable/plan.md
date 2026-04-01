

# Đóng gói Edge Functions thành file ZIP tải được

## Vấn đề
Hệ thống `/mnt/documents/` không hỗ trợ tải thư mục (directory). Các edge functions được copy nguyên cấu trúc thư mục nên báo lỗi khi tải.

## Giải pháp
Đóng gói toàn bộ thư mục `supabase/functions/` thành 1 file `edge-functions.zip` tại `/mnt/documents/edge-functions.zip`.

## Thực hiện
1. Chạy `zip -r /mnt/documents/edge-functions.zip supabase/functions/` từ project root
2. Xuất artifact ZIP để user tải về

## Bonus
Cũng đóng gói luôn `schema.sql` + tất cả CSV data vào 1 file `full-export.zip` duy nhất để tiện tải toàn bộ 1 lần.

