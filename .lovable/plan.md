

## Tối ưu Lưu trữ Transaction History - Gom nhóm theo ngày

### Mục tiêu
Thay đổi cách lưu trữ và hiển thị usage transactions để tiết kiệm tài nguyên database:
- Gom các lượt check trong cùng ngày thành 1 bản ghi duy nhất
- Hiển thị: Tổng keywords đã check, tổng credits trừ, số dư cuối ngày
- Cột Date chỉ hiển thị ngày/tháng/năm (không có giờ phút)

---

### Thiết kế Giải pháp

#### 1. Bảng mới: `daily_usage_summary`

```text
+-------------------+--------------------+
| Column            | Type               |
+-------------------+--------------------+
| id                | uuid (PK)          |
| user_id           | uuid (FK)          |
| usage_date        | date (unique/user) |
| total_keywords    | integer            |
| total_credits     | integer            |
| check_count       | integer            |
| balance_end       | integer            |
| created_at        | timestamptz        |
| updated_at        | timestamptz        |
+-------------------+--------------------+
```

**RLS Policies:**
- Users can view own summaries
- Users can insert/update own summaries

---

#### 2. Thay đổi Logic Trừ Credits

**File: `supabase/functions/check-project-keywords/index.ts`**

Thay vì INSERT mới vào `credit_transactions`, thực hiện:

```typescript
// 1. UPSERT vào daily_usage_summary
// Nếu ngày này đã có record → UPDATE tăng thêm
// Nếu chưa có → INSERT mới

// 2. Xóa bản ghi chi tiết trong credit_transactions sau khi đã aggregate
```

---

#### 3. Database RPC: `upsert_daily_usage`

```sql
CREATE OR REPLACE FUNCTION upsert_daily_usage(
  p_user_id uuid,
  p_keywords_count integer,
  p_credits_used integer,
  p_balance_after integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := CURRENT_DATE;
BEGIN
  INSERT INTO daily_usage_summary (
    user_id, usage_date, total_keywords, total_credits, 
    check_count, balance_end
  )
  VALUES (
    p_user_id, v_today, p_keywords_count, p_credits_used, 
    1, p_balance_after
  )
  ON CONFLICT (user_id, usage_date) DO UPDATE SET
    total_keywords = daily_usage_summary.total_keywords + p_keywords_count,
    total_credits = daily_usage_summary.total_credits + p_credits_used,
    check_count = daily_usage_summary.check_count + 1,
    balance_end = p_balance_after,
    updated_at = NOW();
END;
$$;
```

---

#### 4. Cập nhật Frontend

**File: `src/hooks/useCredits.ts`**

```typescript
// Thêm query mới để lấy daily summary thay vì raw transactions
const dailySummaryQuery = useQuery({
  queryKey: ['daily-usage-summary', user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('daily_usage_summary')
      .select('*')
      .eq('user_id', user.id)
      .order('usage_date', { ascending: false })
      .limit(30); // 30 ngày gần nhất
    
    if (error) throw error;
    return data || [];
  },
  enabled: !!user?.id,
});
```

**File: `src/pages/Billing.tsx`**

```typescript
// Transaction History table columns:
// | Type | Description | Amount | Balance After | Date |
// | Usage | Checked 24 keywords (8 checks) | -72 | 9,835 | 24/01/2026 |

{dailySummary.map((day) => (
  <TableRow key={day.id}>
    <TableCell>
      <div className="flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-red-500" />
        <span>Usage</span>
      </div>
    </TableCell>
    <TableCell className="text-muted-foreground">
      Checked {day.total_keywords} keywords ({day.check_count} checks)
    </TableCell>
    <TableCell className="text-right font-medium text-red-600">
      -{formatCredits(day.total_credits)}
    </TableCell>
    <TableCell className="text-right">
      {formatCredits(day.balance_end)}
    </TableCell>
    <TableCell className="text-muted-foreground">
      {format(new Date(day.usage_date), 'dd/MM/yyyy')}
    </TableCell>
  </TableRow>
))}
```

---

#### 5. Dọn dẹp dữ liệu cũ

**Migration:** Cron job xóa bản ghi `credit_transactions` type='usage' cũ hơn 7 ngày

```sql
-- Thêm vào pg_cron job hiện có hoặc tạo mới
DELETE FROM credit_transactions 
WHERE type = 'usage' 
  AND created_at < NOW() - INTERVAL '7 days';
```

---

### Luồng xử lý mới

```text
User check keywords
       |
       v
+------------------+
| Edge Function    |
| check-project-   |
| keywords         |
+------------------+
       |
       v
+------------------+
| Trừ credits từ   |
| user_credits     |
+------------------+
       |
       v
+------------------+
| UPSERT vào       |
| daily_usage_     |
| summary          |
+------------------+
       |
       v
+------------------+
| (Optional)       |
| INSERT vào       |
| credit_          |
| transactions     |
| để giữ 7 ngày    |
+------------------+
```

---

### Files cần thay đổi

| File | Thay đổi |
|------|----------|
| **Migration** | Tạo bảng `daily_usage_summary` + RLS + unique constraint |
| **Migration** | Tạo RPC `upsert_daily_usage` |
| **Migration** | Migrate dữ liệu cũ từ `credit_transactions` sang summary |
| **Migration** | Thêm cron job xóa transactions cũ |
| `check-project-keywords/index.ts` | Gọi RPC thay vì INSERT trực tiếp |
| `src/hooks/useCredits.ts` | Thêm query `daily_usage_summary` |
| `src/pages/Billing.tsx` | Hiển thị theo format mới |

---

### Kết quả sau khi hoàn thành

**Trước:**
- 12 bản ghi riêng lẻ mỗi ngày (nếu check 12 lần)
- Mỗi bản ghi: ~200 bytes

**Sau:**
- 1 bản ghi tổng hợp mỗi ngày
- Tiết kiệm ~92% storage cho usage transactions
- UI gọn gàng, dễ đọc hơn

