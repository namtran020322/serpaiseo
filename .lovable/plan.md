

## Kế hoạch: Cập nhật SEPAY_SECRET_KEY và Sửa Webhook Signature

### Vấn đề Phát hiện

1. **SEPAY_SECRET_KEY** trong Supabase secrets có thể không khớp với key bạn sẽ cấu hình trong SePay dashboard
2. **Chuỗi ký webhook** trong code hiện tại có thể không đúng format SePay IPN

---

### Bước 1: Cập nhật Secret Key

Cần cập nhật `SEPAY_SECRET_KEY` trong Supabase secrets với giá trị mới:
```
fbNvH5qiuX6vHEHjFQS6Fsnu
```

---

### Bước 2: Xác nhận Format Signature IPN

Tài liệu bạn cung cấp là cho **tạo form checkout** (client → SePay). Cần xác nhận format signature cho **IPN webhook** (SePay → server).

Theo code hiện tại, webhook đang verify với các fields:
```
notification_type, order_id, order_invoice_number, order_amount, order_status, transaction_id, timestamp
```

Nếu SePay IPN dùng cùng format với form checkout, cần sửa thành:
```
merchant, operation, payment_method, order_amount, currency, order_invoice_number, order_description, customer_id, success_url, error_url, cancel_url
```

Tuy nhiên, **IPN webhook thường có format khác** vì nó không có success_url, error_url, etc.

---

### Giải pháp Đề xuất

#### A. Cập nhật Secret Key (Bắt buộc)

Sử dụng tool để cập nhật secret với giá trị mới.

#### B. Sửa Logic Verify Signature (Tùy thuộc docs IPN)

**Option 1**: Nếu SePay IPN dùng cùng secret key nhưng khác format signature → cần docs cụ thể từ SePay

**Option 2**: Tạm thời log raw signature để debug:

```typescript
console.log('[DEBUG] Payload signature:', payload.signature)
console.log('[DEBUG] Expected signature:', expectedBase64)
console.log('[DEBUG] Signed string:', signedString)
```

---

### Bước 3: Xử lý Đơn hàng Đã Thanh toán

Sau khi sửa xong, cần **trigger lại webhook** hoặc **xử lý thủ công** đơn hàng `ORD-56F84070-1769229017732`:

```sql
-- Gọi RPC để cộng credits thủ công
SELECT process_payment_webhook(
  'ORD-56F84070-1769229017732',
  'sepay_order_id',  -- Lấy từ SePay dashboard
  'sepay_transaction_id'
);
```

---

### Files Thay đổi

| File | Thay đổi |
|------|----------|
| Supabase Secrets | Cập nhật `SEPAY_SECRET_KEY` = `fbNvH5qiuX6vHEHjFQS6Fsnu` |
| `supabase/functions/sepay-webhook/index.ts` | Thêm debug logs hoặc sửa format signature nếu có docs IPN |

---

### Câu hỏi cho Bạn

Bạn có tài liệu cụ thể về **format signature IPN webhook** từ SePay không? Vì tài liệu bạn gửi là cho form checkout, có thể IPN dùng format khác.

Nếu không có docs IPN riêng, tôi sẽ:
1. Cập nhật secret key mới
2. Thêm debug logs để xem SePay gửi signature như thế nào
3. Sau đó sửa logic verify cho khớp

