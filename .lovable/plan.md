

## Kế hoạch: Sửa Thứ tự Form Data cho SePay Checkout

### Vấn đề Chính

1. **Thứ tự form_data không khớp với SePay requirements**
2. **Signature string đang đúng, nhưng form HTML cần đúng thứ tự**
3. **IPN webhook có thể không có signature** (theo sample trong docs)

---

### Thay đổi Chi tiết

#### File: `supabase/functions/create-sepay-order/index.ts`

**Sửa form_data thứ tự theo đúng docs SePay:**

```typescript
// Thứ tự CHÍNH XÁC theo SePay docs:
form_data: {
  merchant: sepayMerchantId,
  currency: 'VND',
  order_amount: pkg.price.toString(),
  operation: 'PURCHASE',
  order_description: description,
  order_invoice_number: orderInvoiceNumber,
  // customer_id: không có thì bỏ qua
  success_url: successUrl,
  error_url: errorUrl,
  cancel_url: cancelUrl,
  signature: signature
}
```

Thứ tự này đã đúng, nhưng cần đảm bảo frontend submit form theo đúng thứ tự này.

---

#### File: `src/pages/Billing.tsx` 

**Kiểm tra thứ tự form fields khi submit:**

Frontend phải tạo form với input theo đúng thứ tự mà backend trả về.

---

#### File: `supabase/functions/sepay-webhook/index.ts`

**Giữ nguyên logic hiện tại:**

Theo IPN sample trong docs, không có `signature` field. Logic hiện tại đã xử lý đúng:
- Nếu có signature → verify
- Nếu không có → log warning và tiếp tục xử lý

---

### Verification

Sau khi sửa, test bằng cách:
1. Tạo đơn hàng mới
2. Kiểm tra URL redirect có giống format demo: `https://pay-sandbox.sepay.vn/v1/checkout?merchant=...&signature=...`
3. Thanh toán thử và kiểm tra webhook logs

---

### Technical Changes Summary

| File | Thay đổi |
|------|----------|
| `create-sepay-order/index.ts` | Thêm log để debug form data, đảm bảo thứ tự đúng |
| `Billing.tsx` | Đảm bảo form submit theo đúng thứ tự fields |
| `sepay-webhook/index.ts` | Không thay đổi - logic hiện tại đã hợp lý |

