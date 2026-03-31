

# Export toàn bộ dữ liệu dự án

## Tổng quan

Export 3 phần: **Database schema** (tables, functions, RLS policies, triggers), **Database data** (tất cả records), và **Edge Functions** (đã có sẵn trong repo).

## Chi tiết

### 1. Database Schema → SQL file
- Export tất cả table definitions, indexes, constraints
- Export all DB functions (`claim_next_queue_job`, `process_payment_webhook`, etc.)
- Export RLS policies
- Export custom types (`app_role` enum)
- Output: `/mnt/documents/schema.sql`

### 2. Database Data → CSV files
- Export từng table ra CSV riêng biệt (UTF-8 BOM cho Excel compatibility)
- Tables: `projects`, `project_classes`, `project_keywords`, `keyword_ranking_history`, `ranking_check_queue`, `billing_orders`, `credit_transactions`, `user_credits`, `profiles`, `user_roles`, `trial_credits`, `announcements`, `admin_actions_log`, `daily_usage_summary`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`
- Output: `/mnt/documents/data/*.csv`

### 3. Edge Functions
- Đã có sẵn trong repo tại `supabase/functions/`
- Sẽ copy toàn bộ thư mục ra `/mnt/documents/edge-functions/` để tiện sử dụng

### Output cuối cùng
```
/mnt/documents/
├── schema.sql          (toàn bộ schema + functions + RLS)
├── data/
│   ├── projects.csv
│   ├── project_classes.csv
│   ├── ...
│   └── (18 tables)
└── edge-functions/
    ├── process-ranking-queue/
    ├── check-project-keywords/
    └── ...
```

## Lưu ý
- Edge functions code giống 100% với code trong repo — chỉ copy để tiện
- Data export dùng `psql` với quyền SELECT (read-only, an toàn)
- Khi import vào Supabase riêng, chạy `schema.sql` trước rồi import CSV data sau

