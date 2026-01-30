
## Kế hoạch Nâng cấp Global Task Widget

### Vấn đề 1: Xung đột Toast - Widget (Giải pháp triệt để)

**Phân tích nguyên nhân hiện tại không hoạt động:**
- MutationObserver đang observe `[data-sonner-toaster]` nhưng toaster có thể chưa mount khi widget render
- Toast animations có delay, việc đọc `getBoundingClientRect()` quá sớm cho ra kết quả không chính xác
- CSS `bottom-4` của widget và toast cùng gốc tọa độ nên khó tính offset chính xác

**Giải pháp triệt để: Sử dụng Sonner `offset` prop + z-index separation**

| Thay đổi | Chi tiết |
|----------|----------|
| `sonner.tsx` | Thêm `offset="80px"` để toast luôn cách bottom 80px |
| `GlobalTaskWidget` | Giữ `bottom-4` (16px) - Widget nằm dưới |
| z-index | Toast z-50 (mặc định), Widget z-40 - Toast sẽ hiển thị phía trên |

```text
+---------------------------+
|      Main Content         |
+---------------------------+
|  Toast (z-50, bottom-80px)|   ← Toasts xuất hiện cao hơn
+---------------------------+
|  Widget (z-40, bottom-16px)|  ← Widget nằm thấp, không bị che
+---------------------------+
```

**Ưu điểm:**
- Không cần MutationObserver phức tạp
- Không cần JavaScript tính toán offset
- Native Sonner behavior - ổn định 100%
- Code đơn giản, dễ maintain

**Files thay đổi:**
- `src/components/ui/sonner.tsx`: Thêm `offset="80px"`
- `src/components/GlobalTaskWidget.tsx`: Đổi `z-50` thành `z-40`, xóa toàn bộ MutationObserver code

---

### Vấn đề 2: Auto-Refresh dữ liệu khi Task hoàn thành

**Flow yêu cầu:**

```text
Task status: processing → completed
                ↓
        Check current URL
                ↓
    ┌──────────────────────────────┐
    │ URL matches task.classId?    │
    └──────────────────────────────┘
           ↓ YES              ↓ NO
   invalidateQueries()      Do nothing
   Show "Data updated"
```

**Implementation trong GlobalTaskWidget.tsx:**

1. **Import thêm:**
   - `useQueryClient` từ `@tanstack/react-query`
   - `useLocation` từ `react-router-dom`

2. **Thêm state tracking:**
   - `refreshedClassIds: Set<string>` - Track các class đã được refresh để không refresh lặp

3. **useEffect để detect task completion:**
```typescript
useEffect(() => {
  tasks.forEach((task) => {
    if (task.status === "completed" && !refreshedClassIds.has(task.classId)) {
      // Check if user is on this class's page
      const isOnClassPage = location.pathname.includes(`/classes/${task.classId}`);
      
      if (isOnClassPage) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ 
          queryKey: ["keywords-paginated", task.classId] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["class-ranking-stats", task.classId] 
        });
        
        // Mark as refreshed
        setRefreshedClassIds((prev) => new Set(prev).add(task.classId));
      }
    }
  });
}, [tasks, location.pathname, queryClient]);
```

4. **UI hiển thị "Data updated":**
   - Thêm dòng text màu xanh lá trong task card khi vừa hoàn thành và đã refresh
   - Text: "✓ Data updated" với class `text-green-600`

---

### Chi tiết Files cần thay đổi

#### File 1: `src/components/ui/sonner.tsx`

```typescript
<Sonner
  theme={theme as ToasterProps["theme"]}
  position="bottom-right"
  offset="80px"           // ← THÊM: Toasts cách bottom 80px
  className="toaster group"
  // ... rest
/>
```

#### File 2: `src/components/GlobalTaskWidget.tsx`

**Thay đổi chính:**

1. **Imports:**
```typescript
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
```

2. **Xóa toàn bộ MutationObserver useEffect** (lines 32-82)

3. **Thêm auto-refresh logic:**
```typescript
const location = useLocation();
const queryClient = useQueryClient();
const [refreshedClassIds, setRefreshedClassIds] = useState<Set<string>>(new Set());

// Auto-refresh data when task completes on current page
useEffect(() => {
  tasks.forEach((task) => {
    if (task.status === "completed" && !refreshedClassIds.has(task.classId)) {
      const isOnClassPage = location.pathname.includes(`/classes/${task.classId}`);
      
      if (isOnClassPage) {
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ 
          queryKey: ["keywords-paginated", task.classId] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["class-ranking-stats", task.classId] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["class-metadata", task.classId] 
        });
        
        setRefreshedClassIds((prev) => new Set(prev).add(task.classId));
      }
    }
  });
}, [tasks, location.pathname, queryClient, refreshedClassIds]);

// Clear refreshed IDs when tasks are removed
useEffect(() => {
  const activeIds = new Set(tasks.map(t => t.classId));
  setRefreshedClassIds((prev) => {
    const newSet = new Set<string>();
    prev.forEach(id => {
      if (activeIds.has(id)) newSet.add(id);
    });
    return newSet;
  });
}, [tasks]);
```

4. **Thay đổi z-index trong container div:**
```tsx
<div 
  className={cn(
    "fixed bottom-4 right-4 z-40",  // ← ĐỔI: z-50 → z-40
    "animate-in slide-in-from-bottom-5 fade-in duration-300"
  )}
>
```

5. **Thêm "Data updated" indicator trong task card:**
```tsx
{/* Row 3: Details + Data updated indicator */}
<div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5">
  <span>
    {task.status === "pending" 
      ? "Waiting..." 
      : isCompleted
      ? refreshedClassIds.has(task.classId)
        ? "✓ Data updated"
        : "Completed"
      : isFailed
      ? "Failed"
      : `${task.progress}/${task.total} keywords`
    }
  </span>
  <span>{progressPercent}%</span>
</div>
```

Và thêm màu xanh lá cho text khi refreshed:
```tsx
<span className={cn(
  isCompleted && refreshedClassIds.has(task.classId) && "text-green-600 font-medium"
)}>
```

---

### Kết quả mong đợi

**Toast/Widget separation:**
- Widget cố định ở `bottom-16px`, z-index 40
- Toasts xuất hiện ở `bottom-80px`, z-index 50 (cao hơn widget)
- Không còn overlap, không cần code phức tạp

**Auto-refresh UX:**
- User đang ở trang Class A → Task A hoàn thành → Data tự động refresh
- Hiển thị "✓ Data updated" màu xanh trong widget
- User không cần F5 để thấy dữ liệu mới

---

### Tóm tắt thay đổi

| File | Hành động |
|------|-----------|
| `src/components/ui/sonner.tsx` | Thêm `offset="80px"` |
| `src/components/GlobalTaskWidget.tsx` | 1. Xóa MutationObserver code<br>2. Thêm auto-refresh logic<br>3. Đổi z-50 → z-40<br>4. Thêm "Data updated" UI |
