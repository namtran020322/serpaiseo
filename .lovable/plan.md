

## Kế hoạch: Chuyển hướng trực tiếp đến SePay (Bỏ Iframe)

### Vấn đề Hiện tại

Iframe bị chặn bởi SePay (X-Frame-Options), dẫn đến trang trắng với loading indicator vô hạn.

### Giải pháp

Thay vì dùng iframe/modal, sẽ **chuyển hướng trực tiếp toàn trang** đến SePay checkout. Sau khi thanh toán xong, SePay sẽ redirect về `success_url`, `error_url`, hoặc `cancel_url`.

---

### Thay đổi Chi tiết

#### 1. `src/pages/Billing.tsx`

Xóa PaymentModal và thay bằng logic submit form trực tiếp:

```tsx
const handlePurchase = async (packageId: string) => {
  if (!user) return;
  
  setPurchaseLoading(packageId);
  
  try {
    const { data, error } = await supabase.functions.invoke('create-sepay-order', {
      body: { package_id: packageId },
    });

    if (error) throw error;

    // Redirect trực tiếp đến SePay thay vì mở modal
    if (data?.checkout_action && data?.form_data) {
      // Tạo form ẩn và submit
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.checkout_action;
      
      // Thêm fields theo đúng thứ tự SePay
      const fieldOrder = [
        'merchant', 'currency', 'order_amount', 'operation',
        'order_description', 'order_invoice_number',
        'success_url', 'error_url', 'cancel_url', 'signature'
      ];
      
      fieldOrder.forEach(key => {
        if (data.form_data[key]) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = data.form_data[key];
          form.appendChild(input);
        }
      });
      
      document.body.appendChild(form);
      form.submit(); // Redirect toàn trang
    } else {
      throw new Error('Invalid response from payment service');
    }
  } catch (error: any) {
    console.error('Purchase error:', error);
    toast({
      variant: "destructive",
      title: "Purchase failed",
      description: error.message || "Unable to create order. Please try again.",
    });
    setPurchaseLoading(null);
  }
};
```

#### 2. Xóa các state không cần thiết

Loại bỏ các state liên quan đến PaymentModal:
- `paymentModalOpen`
- `checkoutAction`
- `formData`
- `currentOrderId`
- `expireOn`

#### 3. Xóa import và render PaymentModal

Không cần component `PaymentModal` nữa vì đã redirect trực tiếp.

---

### Luồng Thanh toán Mới

```text
+------------------------+
| User clicks "Buy"      |
+------------------------+
          |
          v
+------------------------+
| Edge function tạo      |
| order + form_data      |
+------------------------+
          |
          v
+------------------------+
| Form hidden submit     |
| → Redirect to SePay    |
+------------------------+
          |
          v
+------------------------+
| User trên trang        |
| checkout SePay         |
+------------------------+
          |
    +-----+-----+
    |     |     |
    v     v     v
+------+ +-----+ +--------+
|Success| |Error| |Cancel  |
|URL    | |URL  | |URL     |
+------+ +-----+ +--------+
    |
    v
+------------------------+
| Billing page detect    |
| ?payment=success/error |
| → Show toast           |
+------------------------+
    |
    v
+------------------------+
| Webhook IPN update     |
| → credits added        |
+------------------------+
```

---

### Files Thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/Billing.tsx` | Xóa PaymentModal, thêm logic redirect trực tiếp |
| `src/components/PaymentModal.tsx` | Giữ nguyên (có thể xóa sau nếu không cần) |

---

### Ưu điểm của Cách Này

1. **Không bị chặn bởi X-Frame-Options** - Trang mở trực tiếp, không qua iframe
2. **Đơn giản hơn** - Không cần quản lý state modal phức tạp
3. **UX quen thuộc** - User được redirect đến trang thanh toán như các website khác
4. **Đã có sẵn logic xử lý callback** - Code xử lý `?payment=success/error/cancel` đã có trong `useEffect`

