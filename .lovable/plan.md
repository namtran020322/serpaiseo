

## Kế hoạch Sửa lỗi Race Condition & Thiết kế Global Activity Widget

### Tổng quan vấn đề

**Race Condition Flow hiện tại:**

```text
+-------------------+    +-------------------+
|  useRankingQueue  |    |  Supabase Realtime |
+-------------------+    +-------------------+
         |                        |
    addTask()                 INSERT event
         |                        |
    id: "temp-xxx"           id: "uuid-yyy"
         |                        |
         v                        v
+---------------------------------------+
|          TaskProgressContext          |
|  - Thêm task temp-xxx                 |
|  - Thêm task uuid-yyy (DUPLICATE!)    |
+---------------------------------------+
```

**Logic lỗi (dòng 123-144 trong TaskProgressContext.tsx):**
- Code hiện tại chỉ check `t.id === newData.id`
- Không xử lý trường hợp temp ID khác với real UUID
- Kết quả: 2 thanh progress bar cùng classId

---

## 1. Sửa Race Condition trong TaskProgressContext.tsx

### Giải pháp

Thay đổi logic trong realtime subscription handler:

```typescript
// src/contexts/TaskProgressContext.tsx - Lines 123-144

setTasks((prev) => {
  // FIX: Kiểm tra bằng ID HOẶC classId cho pending/processing tasks
  const existingIdx = prev.findIndex(
    (t) => t.id === newData.id || 
    (t.classId === newData.class_id && 
     (t.status === "pending" || t.status === "processing"))
  );

  const updatedTask: RunningTask = {
    id: newData.id, // Luôn dùng real ID từ server
    classId: newData.class_id,
    className: prev[existingIdx]?.className || "Loading...",
    progress: newData.processed_keywords || 0,
    total: newData.total_keywords || 0,
    status: newData.status,
    startedAt: prev[existingIdx]?.startedAt || new Date(newData.created_at),
    errorMessage: newData.error_message,
  };

  if (existingIdx >= 0) {
    // Update existing task (bao gồm cả temp-xxx → uuid-yyy)
    const updated = [...prev];
    updated[existingIdx] = updatedTask;
    return updated;
  } else if (newData.status === "pending" || newData.status === "processing") {
    // Chỉ thêm mới nếu không tìm thấy task nào matching
    return [...prev, updatedTask];
  }
  return prev;
});
```

**Key changes:**
1. `findIndex` bây giờ match theo **classId** nếu task đang pending/processing
2. Task temp sẽ được **update thành real ID** thay vì tạo mới
3. `startedAt` được preserve từ task cũ

---

## 2. Tạo Global Activity Widget (GlobalTaskWidget.tsx)

### Component mới: `src/components/GlobalTaskWidget.tsx`

```typescript
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useTaskProgress } from "@/contexts/TaskProgressContext";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function GlobalTaskWidget() {
  const { tasks, removeTask } = useTaskProgress();
  const navigate = useNavigate();
  const [visibleTasks, setVisibleTasks] = useState<string[]>([]);

  // Filter active + recently completed tasks
  const activeTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "processing"
  );

  // Auto-hide completed tasks after 3 seconds
  useEffect(() => {
    const completedTasks = tasks.filter(
      (t) => t.status === "completed" || t.status === "failed"
    );
    
    completedTasks.forEach((task) => {
      setTimeout(() => removeTask(task.id), 3000);
    });
  }, [tasks, removeTask]);

  // Don't render if no active tasks
  if (activeTasks.length === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50",
      "animate-in slide-in-from-bottom-5 fade-in duration-300"
    )}>
      <Card className={cn(
        "w-80 max-w-[400px]",
        "bg-background border border-border",
        "shadow-xl rounded-xl"
      )}>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium text-foreground">
            Active Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0 space-y-2">
          {activeTasks.map((task) => {
            const progressPercent = task.total > 0 
              ? Math.round((task.progress / task.total) * 100) 
              : 0;

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/dashboard/classes/${task.classId}`)}
                className={cn(
                  "p-3 rounded-md cursor-pointer transition-colors",
                  "hover:bg-accent/50"
                )}
              >
                {/* Row 1: Class name + Status icon */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium truncate flex-1">
                    {task.className}
                  </span>
                  {task.status === "processing" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : task.status === "completed" ? (
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  ) : task.status === "failed" ? (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <Loader2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Row 2: Progress bar */}
                <Progress 
                  value={progressPercent} 
                  className="h-2 bg-slate-100 [&>div]:bg-primary [&>div]:transition-all"
                />

                {/* Row 3: Details */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5">
                  <span>
                    {task.status === "pending" 
                      ? "Waiting..." 
                      : `${task.progress}/${task.total} keywords`
                    }
                  </span>
                  <span>{progressPercent}%</span>
                </div>

                {/* Error message if any */}
                {task.errorMessage && (
                  <p className="text-xs text-destructive mt-1 truncate">
                    {task.errorMessage}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Styling Details

| Property | Value | Mô tả |
|----------|-------|-------|
| Position | `fixed bottom-4 right-4 z-50` | Góc dưới phải, trên mọi element |
| Width | `w-80 max-w-[400px]` | 320px, max 400px |
| Background | `bg-background` | Trắng (light theme) |
| Border | `border border-border` | Viền mỏng |
| Shadow | `shadow-xl` | Bóng đổ mạnh |
| Corner | `rounded-xl` | Bo góc lớn |
| Animation | `animate-in slide-in-from-bottom-5 fade-in` | Slide + fade in |

---

## 3. Xóa ProcessingTasks từ Sidebar

### Cập nhật: `src/components/AppSidebar.tsx`

```diff
- import { ProcessingTasks } from "@/components/ProcessingTasks";

// ... trong SidebarContent
-        {/* Processing Tasks */}
-        <ProcessingTasks />
```

---

## 4. Nhúng GlobalTaskWidget vào DashboardLayout

### Cập nhật: `src/layouts/DashboardLayout.tsx`

```typescript
import { GlobalTaskWidget } from "@/components/GlobalTaskWidget";

// Trong return statement, thêm sau </main>:
<GlobalTaskWidget />
```

Vị trí trong JSX:
```tsx
<SidebarProvider>
  <div className="flex w-full min-h-screen">
    <AppSidebar />
    <main>...</main>
  </div>
  {/* Global Task Widget - nổi trên mọi trang */}
  <GlobalTaskWidget />
</SidebarProvider>
```

---

## Files cần thay đổi

| File | Thay đổi |
|------|----------|
| `src/contexts/TaskProgressContext.tsx` | Sửa logic realtime handler - match by classId |
| `src/components/GlobalTaskWidget.tsx` | **Tạo mới** - Widget nổi góc dưới phải |
| `src/components/AppSidebar.tsx` | Xóa import và sử dụng ProcessingTasks |
| `src/layouts/DashboardLayout.tsx` | Thêm GlobalTaskWidget |

---

## Kết quả mong đợi

### Race Condition Fix
- Khi refresh rank, chỉ hiển thị **1 thanh progress** duy nhất
- Temp ID được thay thế bằng real UUID khi server trả về
- `startedAt` và `className` được preserve từ optimistic update

### Global Task Widget
- Widget nổi cố định góc dưới phải màn hình
- Light theme: nền trắng, shadow mạnh, border mỏng
- Animation: slide từ dưới lên khi xuất hiện
- Click vào task → navigate đến class detail
- Tự động biến mất 3 giây sau khi hoàn thành
- Hiển thị trên mọi trang trong dashboard

