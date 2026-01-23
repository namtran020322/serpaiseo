
## Kế hoạch Sửa Lỗi SePay Payment 404

### Nguyên nhân Lỗi

Theo tài liệu SePay chính thức:
- Endpoint `https://pay.sepay.vn/v1/checkout/init` yêu cầu **POST method** thông qua form HTML
- Code hiện tại đang sử dụng **GET request** với query params → SePay trả về 404

Theo flow đúng:
1. Tạo form HTML với các hidden inputs
2. Submit form (POST) đến `/v1/checkout/init` 
3. SePay validate signature → redirect đến `https://pgapi.sepay.vn?...` (trang checkout thực sự)
4. User thanh toán
5. SePay gọi webhook IPN + redirect user về success/error URL

### Giải pháp

Thay đổi cách hoạt động: Frontend sẽ tạo form hidden và submit vào iframe thay vì load URL trực tiếp.

---

### Thay đổi Chi tiết

#### 1. Edge Function `create-sepay-order/index.ts`

Trả về **form data** thay vì checkout URL:

```typescript
// Response format mới
return {
  success: true,
  order_id: order.id,
  order_invoice_number: orderInvoiceNumber,
  expire_on: expireDate.toISOString(),
  checkout_action: 'https://pay.sepay.vn/v1/checkout/init', // POST endpoint
  form_data: {
    merchant: sepayMerchantId,
    currency: 'VND',
    operation: 'PURCHASE',
    order_amount: pkg.price.toString(),
    order_description: description,
    order_invoice_number: orderInvoiceNumber,
    success_url: successUrl,
    error_url: errorUrl,
    cancel_url: cancelUrl,
    signature: signature
  }
};
```

#### 2. Component `PaymentModal.tsx`

Thay đổi từ load URL sang tạo form hidden và submit vào iframe:

```tsx
interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkoutAction: string | null;  // POST URL
  formData: Record<string, string> | null;  // Form fields
  orderId: string | null;
  expireOn: string | null;
  onPaymentSuccess: () => void;
}

// Trong component:
const iframeRef = useRef<HTMLIFrameElement>(null);
const formRef = useRef<HTMLFormElement>(null);

// Submit form vào iframe khi modal mở
useEffect(() => {
  if (open && checkoutAction && formData && formRef.current) {
    // Submit form vào iframe
    formRef.current.submit();
  }
}, [open, checkoutAction, formData]);

return (
  <Dialog>
    <DialogContent>
      {/* Hidden form để POST vào iframe */}
      <form 
        ref={formRef}
        method="POST"
        action={checkoutAction}
        target="sepay-iframe"
        style={{ display: 'none' }}
      >
        {formData && Object.entries(formData).map(([key, value]) => (
          <input type="hidden" name={key} value={value} key={key} />
        ))}
      </form>
      
      {/* Iframe nhận form submit */}
      <iframe 
        ref={iframeRef}
        name="sepay-iframe"
        className="w-full h-full border-0"
        title="SePay Checkout"
      />
    </DialogContent>
  </Dialog>
);
```

#### 3. `Billing.tsx`

Cập nhật để truyền đúng props cho PaymentModal:

```tsx
const [checkoutAction, setCheckoutAction] = useState<string | null>(null);
const [formData, setFormData] = useState<Record<string, string> | null>(null);

const handlePurchase = async (packageId: string) => {
  // ...
  const { data } = await supabase.functions.invoke('create-sepay-order', {
    body: { package_id: packageId }
  });

  if (data?.checkout_action && data?.form_data) {
    setCheckoutAction(data.checkout_action);
    setFormData(data.form_data);
    setCurrentOrderId(data.order_id);
    setExpireOn(data.expire_on);
    setPaymentModalOpen(true);
  }
};

// Render
<PaymentModal
  open={paymentModalOpen}
  onOpenChange={setPaymentModalOpen}
  checkoutAction={checkoutAction}
  formData={formData}
  orderId={currentOrderId}
  expireOn={expireOn}
  onPaymentSuccess={handlePaymentSuccess}
/>
```

---

### Lưu ý Kỹ thuật Quan trọng

**1. Thứ tự Form Fields:**
Theo tài liệu SePay, thứ tự inputs trong form phải đúng:
1. merchant
2. currency  
3. order_amount
4. operation
5. order_description
6. order_invoice_number
7. customer_id (nếu có)
8. success_url
9. error_url
10. cancel_url
11. signature

**2. Signature Format:**
Chuỗi ký: `merchant=X,operation=Y,order_amount=Z,currency=VND,order_invoice_number=W,order_description=D,success_url=S,error_url=E,cancel_url=C`
(Chỉ include fields có giá trị, theo đúng thứ tự trong danh sách allowed fields)

**3. Iframe Security:**
- Cần `sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation"`
- Nếu SePay block iframe, sẽ fallback sang popup window

**4. Environment Detection:**
- Production: `https://pay.sepay.vn/v1/checkout/init`
- Sandbox: `https://pay-sandbox.sepay.vn/v1/checkout/init`
- Sẽ add flag để chọn environment

---

### Files Thay đổi

| File | Hành động |
|------|-----------|
| `supabase/functions/create-sepay-order/index.ts` | Sửa: Trả về form_data thay vì URL |
| `src/components/PaymentModal.tsx` | Sửa: Tạo hidden form, submit vào iframe |
| `src/pages/Billing.tsx` | Sửa: Handle response mới và truyền props |

---

### Testing Plan

1. Deploy edge function
2. Test gọi edge function trực tiếp để verify response format
3. Click "Get Started" trên Billing page
4. Verify iframe load trang checkout SePay (không phải 404)
5. Thử thanh toán sandbox
6. Verify webhook và credit được cộng
