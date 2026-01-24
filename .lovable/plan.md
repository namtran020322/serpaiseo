

## Kế hoạch Sửa Lỗi SePay Payment Form

### Phân tích Vấn đề

Dựa trên tài liệu SePay và flowchart, tôi phát hiện **2 lỗi quan trọng** trong code hiện tại:

| Vấn đề | Code hiện tại | Đúng theo tài liệu |
|--------|---------------|-------------------|
| **Thứ tự signature fields** | merchant → operation → order_amount → currency... | merchant → operation → payment_method → order_amount → currency... |
| **customer_id trong form** | Không có | Nên có trong form HTML (dù không bắt buộc) |

### Phân tích Chi tiết từ Tài liệu

**1. Thứ tự Signature (quan trọng nhất)**

Theo tài liệu, chuỗi ký phải theo đúng thứ tự trong danh sách allowed fields:
```text
merchant, operation, payment_method, order_amount, currency, 
order_invoice_number, order_description, customer_id, 
success_url, error_url, cancel_url
```

Code hiện tại đang thiếu logic lọc theo allowed fields và chưa giữ đúng thứ tự.

**2. Thứ tự Form HTML**

Theo form mẫu SePay:
```html
1. merchant
2. currency
3. order_amount
4. operation
5. order_description
6. order_invoice_number
7. customer_id (không bắt buộc)
8. success_url
9. error_url
10. cancel_url
11. signature
```

---

### Thay đổi Chi tiết

#### 1. Edge Function `create-sepay-order/index.ts`

**A. Sửa hàm tạo signature theo đúng logic SePay:**

```typescript
// Danh sách allowed fields theo đúng thứ tự SePay
const allowedFields = [
  'merchant', 'operation', 'payment_method', 'order_amount', 'currency',
  'order_invoice_number', 'order_description', 'customer_id',
  'success_url', 'error_url', 'cancel_url'
];

// Tạo object chứa tất cả fields
const fields: Record<string, string> = {
  merchant: sepayMerchantId,
  operation: 'PURCHASE',
  order_amount: pkg.price.toString(),
  currency: 'VND',
  order_invoice_number: orderInvoiceNumber,
  order_description: description,
  success_url: successUrl,
  error_url: errorUrl,
  cancel_url: cancelUrl
};

// Tạo chuỗi ký theo đúng thứ tự allowed fields
const signedParts: string[] = [];
for (const field of allowedFields) {
  if (fields[field]) {
    signedParts.push(`${field}=${fields[field]}`);
  }
}
const signedString = signedParts.join(',');
const signature = await hmacSha256(signedString, sepaySecretKey);
```

**B. Trả về form_data với customer_id (để render đủ fields):**

```typescript
form_data: {
  merchant: sepayMerchantId,
  currency: 'VND',
  order_amount: pkg.price.toString(),
  operation: 'PURCHASE',
  order_description: description,
  order_invoice_number: orderInvoiceNumber,
  // customer_id có thể thêm nếu cần
  success_url: successUrl,
  error_url: errorUrl,
  cancel_url: cancelUrl,
  signature: signature
}
```

#### 2. Component `PaymentModal.tsx`

**A. Sửa thứ tự form fields đúng theo form mẫu:**

```typescript
const fieldOrder = [
  'merchant',
  'currency', 
  'order_amount',
  'operation',
  'order_description',
  'order_invoice_number',
  'customer_id',  // Thêm vào dù không bắt buộc
  'success_url',
  'error_url', 
  'cancel_url',
  'signature'
];
```

**B. Thêm loading indicator và auto-fallback:**

- Thêm state `iframeLoading` để track iframe load
- Auto-show fallback button sau 5 giây nếu iframe trắng
- Cải thiện UX với loading spinner trong iframe container

**C. Cải thiện iframe attributes:**

```tsx
<iframe 
  name="sepay-iframe"
  className="w-full h-full border-0"
  title="SePay Checkout"
  onLoad={() => setIframeLoading(false)}
  onError={handleIframeError}
  sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation"
/>
```

---

### Lưu ý Quan trọng từ Tài liệu

1. **order_invoice_number**: Phải duy nhất, không được trùng lặp ✅ (đã có)
2. **order_amount**: Chỉ hỗ trợ VND, > 0 ✅ (đã có)
3. **URL callback**: Phải là URL công khai ✅ (đã có)
4. **Signature**: Luôn kiểm tra đúng thứ tự fields ⚠️ (cần sửa)
5. **Môi trường Production**: `https://pay.sepay.vn/v1/checkout/init` ✅ (đã có)

---

### Luồng Hoạt động (từ Flowchart)

```text
+------------------------+
| User clicks "Buy Now"  |
+------------------------+
          |
          v
+------------------------+
| Edge function tạo      |
| form_data + signature  |
+------------------------+
          |
          v
+------------------------+
| Modal mở với iframe    |
| + hidden form          |
+------------------------+
          |
          v
+------------------------+
| Form auto-submit POST  |
| đến checkout/init      |
+------------------------+
          |
          v
+------------------------+
| SePay validate         |
| signature              |
+------------------------+
        / \
       /   \
      v     v
+--------+ +--------------+
| Thành  | | Thất bại:    |
| công   | | Lỗi xác thực |
+--------+ +--------------+
    |
    v
+------------------------+
| Redirect đến           |
| pgapi.sepay.vn         |
| (trang thanh toán)     |
+------------------------+
    |
    v
+------------------------+
| User chọn phương thức  |
| và thanh toán          |
+------------------------+
    |
    v
+------------------------+
| Callback về            |
| success/error/cancel   |
+------------------------+
    |
    v
+------------------------+
| Webhook IPN update     |
| billing_orders status  |
+------------------------+
    |
    v
+------------------------+
| Polling detect         |
| status = 'paid'        |
| → Close modal + toast  |
+------------------------+
```

---

### Files Thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/create-sepay-order/index.ts` | Sửa logic tạo signature theo đúng thứ tự allowed fields |
| `src/components/PaymentModal.tsx` | Sửa thứ tự form fields, thêm loading indicator, cải thiện fallback |

---

### Phần Kỹ thuật Chi tiết

**Ví dụ chuỗi signature đúng:**
```text
merchant=MERCHANT_123,operation=PURCHASE,order_amount=200000,currency=VND,order_invoice_number=ORD-ABC12345-1234567890,order_description=Purchase 10000 credits - Basic package,success_url=https://serpaiseo.lovable.app/dashboard/billing?payment=success,error_url=https://serpaiseo.lovable.app/dashboard/billing?payment=error,cancel_url=https://serpaiseo.lovable.app/dashboard/billing?payment=cancel
```

**Base64 HMAC-SHA256:**
```javascript
base64_encode(hash_hmac('sha256', signedString, secretKey, true))
```
→ Code hiện tại đã đúng với `btoa(String.fromCharCode(...new Uint8Array(signature)))`

---

### Testing Plan

1. Deploy edge function với signature đã sửa
2. Click "Get Started" trên Billing page
3. Verify Modal mở và iframe load trang checkout SePay (không còn 404/trắng)
4. Nếu iframe bị block → fallback button "Open Payment Page" hiển thị
5. Thử thanh toán (sandbox hoặc production)
6. Verify webhook update status và credits được cộng

