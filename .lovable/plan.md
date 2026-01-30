

## Kế hoạch Cải thiện Global Task Widget

### Tổng quan các thay đổi

| # | Nhiệm vụ | File |
|---|----------|------|
| 1 | Thêm Scrollable List với header hiển thị số lượng | GlobalTaskWidget.tsx |
| 2 | Xóa toast "Ranking check started" | useRankingQueue.ts |
| 3 | Auto Slide-up khi có Toast xuất hiện | GlobalTaskWidget.tsx + sonner.tsx |

---

## 1. Scrollable List với Header số lượng

### Cập nhật: `src/components/GlobalTaskWidget.tsx`

**Thêm ScrollArea từ Shadcn UI:**

```typescript
import { ScrollArea } from "@/components/ui/scroll-area";

// Header hiển thị số lượng
<CardHeader className="py-3 px-4 pb-0">
  <CardTitle className="text-sm font-medium text-foreground">
    Active Tasks ({visibleTasks.length})
  </CardTitle>
</CardHeader>

// Scrollable content với max-height
<CardContent className="p-2 pt-2">
  <ScrollArea className="max-h-64">
    <div className="space-y-1 pr-2">
      {visibleTasks.map((task) => (...))}
    </div>
  </ScrollArea>
</CardContent>
```

**Specs:**
- `max-h-64` = 256px (đủ cho ~3-4 tasks)
- Sử dụng Shadcn `ScrollArea` để có custom scrollbar đẹp
- `pr-2` để scrollbar không đè lên content

---

## 2. Xóa Toast "Ranking check started"

### Cập nhật: `src/hooks/useRankingQueue.ts`

```diff
    onSuccess: (data, variables) => {
-     toast.success("Ranking check started", {
-       description: `Checking ${data.total_keywords} keywords for ${variables.className}`,
-     });
+     // Widget xuất hiện là đủ tín hiệu - không cần toast
      
      // Trigger queue processing immediately (don't wait for cron)
      supabase.functions.invoke("process-ranking-queue").catch(console.error);
    },
```

---

## 3. Auto Slide-up khi có Toast

### Phương pháp tiếp cận

Sonner library không expose event khi toast xuất hiện/biến mất một cách trực tiếp. Tuy nhiên, có thể dùng **MutationObserver** để detect khi toast container thay đổi.

### Cập nhật: `src/components/GlobalTaskWidget.tsx`

```typescript
import { useEffect, useState, useRef } from "react";

export function GlobalTaskWidget() {
  const [toastOffset, setToastOffset] = useState(0);
  
  // Observe toast container for changes
  useEffect(() => {
    // Sonner renders toasts in an element with data-sonner-toaster attribute
    const checkToastHeight = () => {
      const toaster = document.querySelector('[data-sonner-toaster]');
      if (toaster) {
        const toasts = toaster.querySelectorAll('[data-sonner-toast]');
        if (toasts.length > 0) {
          // Calculate total height of visible toasts + gap
          let totalHeight = 0;
          toasts.forEach((toast) => {
            totalHeight += toast.getBoundingClientRect().height + 8; // 8px gap
          });
          setToastOffset(totalHeight);
        } else {
          setToastOffset(0);
        }
      }
    };

    // Initial check
    checkToastHeight();

    // Observe DOM changes
    const observer = new MutationObserver(() => {
      // Small delay để toast animation hoàn thành
      setTimeout(checkToastHeight, 100);
    });

    const toaster = document.querySelector('[data-sonner-toaster]');
    if (toaster) {
      observer.observe(toaster, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    // Also listen to window resize
    window.addEventListener('resize', checkToastHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkToastHeight);
    };
  }, []);

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "animate-in slide-in-from-bottom-5 fade-in duration-300",
        "transition-transform duration-300 ease-out" // Smooth slide
      )}
      style={{ 
        transform: toastOffset > 0 ? `translateY(-${toastOffset}px)` : undefined 
      }}
    >
      {/* Widget content */}
    </div>
  );
}
```

### Lưu ý về Sonner Position

Sonner mặc định hiển thị ở `bottom-right`. Cần đảm bảo cả hai ở cùng vị trí để tính toán chính xác:

**Cập nhật `src/components/ui/sonner.tsx`:**

```typescript
<Sonner
  position="bottom-right"  // Explicit position
  // ... other props
/>
```

---

## Files cần thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/GlobalTaskWidget.tsx` | ScrollArea, header count, MutationObserver cho auto slide-up |
| `src/hooks/useRankingQueue.ts` | Xóa toast.success trong onSuccess |
| `src/components/ui/sonner.tsx` | Thêm `position="bottom-right"` explicit |

---

## Kết quả mong đợi

### Stack List
- Một Widget duy nhất chứa tất cả tasks
- Header: "Active Tasks (2)" với số lượng động
- Scrollable list với max-height 256px
- Custom scrollbar từ Shadcn ScrollArea

### Toast Behavior
- KHÔNG hiển thị toast "Ranking check started"
- Widget xuất hiện ngay là đủ tín hiệu

### Auto Slide-up
- Khi toast xuất hiện → Widget trượt lên smooth
- Khi toast biến mất → Widget trượt xuống vị trí cũ
- Animation: `transition-transform duration-300 ease-out`

