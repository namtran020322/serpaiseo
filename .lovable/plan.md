
## Kế hoạch: Chuyển SePay Payment sang Iframe Modal

### Vấn đề Hiện tại

Code hiện tại đang sử dụng **VietQR** (`qr.sepay.vn/img`) - đây KHÔNG phải cách tích hợp chính thức của Cổng thanh toán SePay. Theo tài liệu SePay chính thức, cách đúng là:

1. Tạo form HTML với các tham số và signature
2. POST form đến `https://pay.sepay.vn/v1/checkout/init`
3. User được redirect đến trang checkout SePay

### Giải pháp: Iframe trong Modal

Thay vì redirect toàn bộ trang, sẽ:
1. Tạo URL checkout với query params (thay vì POST form)
2. Load URL đó trong iframe bên trong Dialog Modal
3. Polling status để detect thanh toán thành công
4. Đóng modal khi user quay lại từ success/cancel/error URL

---

### Thay đổi Chi tiết

#### 1. Edge Function `create-sepay-order/index.ts`

**Xóa logic VietQR**, thay bằng:
- Tạo order trong database như hiện tại
- Tạo signature theo đúng format SePay (field=value,field=value)
- Trả về checkout URL với params đã encode

```typescript
// Xóa display_mode='qr' và VietQR logic

// Build checkout URL với các tham số
const checkoutParams = new URLSearchParams();
checkoutParams.set('merchant', sepayMerchantId);
checkoutParams.set('currency', 'VND');
checkoutParams.set('operation', 'PURCHASE');
checkoutParams.set('order_amount', pkg.price.toString());
checkoutParams.set('order_description', description);
checkoutParams.set('order_invoice_number', orderInvoiceNumber);
checkoutParams.set('success_url', successUrl);
checkoutParams.set('error_url', errorUrl);
checkoutParams.set('cancel_url', cancelUrl);

// Tạo signature theo thứ tự đúng của SePay
const signedFields = [
  `merchant=${sepayMerchantId}`,
  `operation=PURCHASE`,
  `order_amount=${pkg.price}`,
  `currency=VND`,
  `order_invoice_number=${orderInvoiceNumber}`,
  `order_description=${description}`,
  `success_url=${successUrl}`,
  `error_url=${errorUrl}`,
  `cancel_url=${cancelUrl}`
];
const signature = await hmacSha256(signedFields.join(','), sepaySecretKey);
checkoutParams.set('signature', signature);

// URL checkout cho iframe
const checkoutUrl = `https://pay.sepay.vn/v1/checkout/init?${checkoutParams.toString()}`;

return {
  success: true,
  order_id: order.id,
  checkout_url: checkoutUrl,
  expire_on: expireDate.toISOString()
};
```

#### 2. Component `PaymentQRModal.tsx` -> `PaymentModal.tsx`

Đổi tên và thay đổi logic:

```tsx
interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkoutUrl: string | null;
  orderId: string | null;
  expireOn: string | null;
  onPaymentSuccess: () => void;
}

export function PaymentModal({ 
  open, 
  onOpenChange, 
  checkoutUrl,
  orderId,
  expireOn,
  onPaymentSuccess 
}: PaymentModalProps) {
  // Countdown timer (giữ nguyên logic)
  
  // Polling status mỗi 5 giây (giữ nguyên logic)
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle>Complete Payment</DialogTitle>
          {/* Timer hiển thị */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Expires in {formatTime(timeLeft)}</span>
            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </DialogHeader>
        
        {/* Iframe load SePay checkout */}
        <div className="flex-1 min-h-0">
          {checkoutUrl && (
            <iframe 
              src={checkoutUrl}
              className="w-full h-full border-0"
              title="SePay Checkout"
              allow="payment"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3. `Billing.tsx`

Cập nhật để sử dụng component mới:

```tsx
// State mới
const [paymentModalOpen, setPaymentModalOpen] = useState(false);
const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
const [expireOn, setExpireOn] = useState<string | null>(null);

const handlePurchase = async (packageId: string) => {
  setPurchaseLoading(packageId);
  
  const { data, error } = await supabase.functions.invoke('create-sepay-order', {
    body: { package_id: packageId }
  });

  if (error) throw error;

  if (data?.checkout_url) {
    setCheckoutUrl(data.checkout_url);
    setCurrentOrderId(data.order_id);
    setExpireOn(data.expire_on);
    setPaymentModalOpen(true);
  }
  
  setPurchaseLoading(null);
};

// Render
<PaymentModal
  open={paymentModalOpen}
  onOpenChange={setPaymentModalOpen}
  checkoutUrl={checkoutUrl}
  orderId={currentOrderId}
  expireOn={expireOn}
  onPaymentSuccess={handlePaymentSuccess}
/>
```

---

### Lưu ý Kỹ thuật Quan trọng

**1. X-Frame-Options của SePay:**
- Cần xác nhận SePay cho phép embed trong iframe
- Nếu SePay block iframe (có header X-Frame-Options: DENY), giải pháp backup là mở popup window thay vì iframe

**2. Signature Format:**
Theo tài liệu SePay, thứ tự các field phải đúng:
```
merchant,operation,payment_method,order_amount,currency,order_invoice_number,order_description,customer_id,success_url,error_url,cancel_url
```
(Chỉ include các field có giá trị)

**3. Callback URLs trong Iframe:**
- Khi user hoàn thành payment, SePay redirect trong iframe đến success_url
- Cần detect URL change hoặc dựa vào polling để biết kết quả

**4. Fallback Plan:**
Nếu SePay không cho phép iframe, sử dụng `window.open()` để mở popup:
```typescript
const popup = window.open(checkoutUrl, 'SePay Payment', 'width=600,height=800');
// Monitor popup.closed + polling
```

---

### Files Thay đổi

| File | Hành động |
|------|-----------|
| `supabase/functions/create-sepay-order/index.ts` | Sửa: Xóa VietQR, trả về checkout_url |
| `src/components/PaymentQRModal.tsx` | Xóa |
| `src/components/PaymentModal.tsx` | Tạo mới: Dialog với iframe |
| `src/pages/Billing.tsx` | Sửa: Dùng PaymentModal thay QRModal |

---

### Thứ tự Triển khai

1. Cập nhật Edge Function trả về checkout_url đúng format SePay
2. Tạo PaymentModal mới với iframe
3. Cập nhật Billing.tsx để sử dụng
4. Test thử - nếu SePay block iframe, chuyển sang popup fallback
