

## Kế hoạch Thêm Cơ chế Chống Spam Refresh và Xác nhận Hành động Quan trọng

### Phân tích Hiện trạng

**1. Nút Refresh Rankings:**
- **ClassDetail.tsx (dòng 250):** Nút "Refresh Rankings" chỉ disable khi `addRankingJob.isPending` (chỉ trong thời gian ngắn khi gọi API)
- **ClassRow.tsx (dòng 117):** Tương tự, chỉ disable khi `isChecking`
- **ProjectRow.tsx (dòng 143):** Tương tự pattern

**Vấn đề:** User có thể spam click liên tục vì nút chỉ bị disable trong ~1-2 giây. Nếu class đang có job running, user vẫn có thể tạo thêm job mới.

**2. Xác nhận Xóa:**
- **ClassRow.tsx (dòng 138-157):** Đã có AlertDialog xác nhận xóa Class
- **ProjectRow.tsx (dòng 169-188):** Đã có AlertDialog xác nhận xóa Project
- **KeywordsTable.tsx:** Xóa keyword KHÔNG có dialog xác nhận - xóa trực tiếp!
- **ProjectsTable.tsx (dòng 246-251):** Xóa project (multi-select) KHÔNG có xác nhận!

---

### Giải pháp Đề xuất

#### 1. Chống Spam Refresh: Kiểm tra Task đang chạy

Sử dụng `TaskProgressContext` để kiểm tra class có đang trong hàng đợi không trước khi cho phép refresh.

**Logic:**
```text
┌─────────────────────────────────────────────────────────────┐
│  User click "Refresh Rankings"                               │
│       ↓                                                      │
│  Check: tasks.find(t => t.classId === classId &&            │
│         (t.status === 'pending' || t.status === 'processing'))│
│       ↓                                                      │
│  ├── Có task đang chạy → Disable button + Toast "Already     │
│  │                       running"                            │
│  │                                                           │
│  └── Không có task → Cho phép refresh bình thường           │
└─────────────────────────────────────────────────────────────┘
```

**Files cần sửa:**
| File | Thay đổi |
|------|----------|
| `src/pages/ClassDetail.tsx` | Thêm logic kiểm tra task đang chạy cho nút Refresh |
| `src/components/projects/ClassRow.tsx` | Thêm logic tương tự cho menu Refresh |
| `src/components/projects/ProjectRow.tsx` | Thêm logic cho nút "Refresh All Classes" |

**Chi tiết ClassDetail.tsx:**
```typescript
// Import thêm
import { useTaskProgress } from "@/contexts/TaskProgressContext";

// Trong component
const { tasks } = useTaskProgress();

// Check if class has running task
const isClassRunning = tasks.some(
  (t) => t.classId === classId && 
         (t.status === "pending" || t.status === "processing")
);

// Disable button khi đang running
<Button 
  onClick={handleRefresh} 
  disabled={addRankingJob.isPending || isViewingHistory || isClassRunning}
>
  <RefreshCw className={`mr-2 h-4 w-4 ${isClassRunning ? "animate-spin" : ""}`} />
  {isClassRunning ? "Checking..." : "Refresh Rankings"}
</Button>
```

---

#### 2. Dialog Xác nhận cho Xóa Keyword

Tạo component `ConfirmDeleteDialog` có thể tái sử dụng, hiển thị số lượng items sẽ bị xóa.

**Component mới: `src/components/projects/ConfirmDeleteDialog.tsx`**

```typescript
interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  itemCount?: number;
  itemType?: string; // "keyword", "project", "class"
  onConfirm: () => void;
  isLoading?: boolean;
}
```

**Files cần sửa:**

| File | Thay đổi |
|------|----------|
| `src/components/projects/ConfirmDeleteDialog.tsx` | Tạo mới component |
| `src/components/projects/KeywordsTable.tsx` | Thêm dialog xác nhận trước khi xóa keywords |
| `src/components/projects/ProjectsTable.tsx` | Thêm dialog xác nhận trước khi xóa projects (multi-select) |
| `src/components/ui/data-table-toolbar.tsx` | Truyền callback để hiển thị dialog thay vì xóa trực tiếp |

---

### Chi tiết Implementation

#### A. Component ConfirmDeleteDialog

```typescript
// src/components/projects/ConfirmDeleteDialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  itemCount?: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  itemCount,
  onConfirm,
  isLoading,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            {itemCount && itemCount > 1 && (
              <span className="block mt-2 font-medium text-foreground">
                {itemCount} items will be deleted.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

#### B. Sửa KeywordsTable.tsx

```typescript
// Thêm state cho dialog
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
const [isDeleting, setIsDeleting] = useState(false);

// Handler mới - mở dialog thay vì xóa trực tiếp
const handleDeleteClick = (ids: string[]) => {
  setPendingDeleteIds(ids);
  setDeleteDialogOpen(true);
};

// Confirm handler
const handleConfirmDelete = async () => {
  if (!onDeleteKeywords) return;
  setIsDeleting(true);
  try {
    await onDeleteKeywords(pendingDeleteIds);
    setRowSelection({});
  } finally {
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setPendingDeleteIds([]);
  }
};

// Trong toolbar - thay đổi callback
<DataTableToolbar
  ...
  onDeleteSelected={onDeleteKeywords ? () => handleDeleteClick(selectedIds) : undefined}
/>

// Thêm dialog
<ConfirmDeleteDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  title="Delete Keywords"
  description="Are you sure you want to delete the selected keywords? This will also delete all ranking history associated with them. This action cannot be undone."
  itemCount={pendingDeleteIds.length}
  onConfirm={handleConfirmDelete}
  isLoading={isDeleting}
/>
```

---

#### C. Sửa ProjectsTable.tsx

Tương tự pattern như KeywordsTable.

---

#### D. Sửa ClassDetail.tsx, ClassRow.tsx, ProjectRow.tsx

Thêm logic kiểm tra task đang chạy từ `TaskProgressContext`.

---

### Tổng kết Files cần thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/projects/ConfirmDeleteDialog.tsx` | **Tạo mới** - Reusable confirm dialog |
| `src/pages/ClassDetail.tsx` | Thêm kiểm tra `isClassRunning` để disable nút Refresh |
| `src/components/projects/ClassRow.tsx` | Thêm kiểm tra task running + import TaskProgressContext |
| `src/components/projects/ProjectRow.tsx` | Thêm kiểm tra any class running + import TaskProgressContext |
| `src/components/projects/KeywordsTable.tsx` | Thêm ConfirmDeleteDialog trước khi xóa keywords |
| `src/components/projects/ProjectsTable.tsx` | Thêm ConfirmDeleteDialog trước khi xóa projects |

---

### Kết quả mong đợi

**Chống Spam Refresh:**
- Nút "Refresh Rankings" bị disable và hiển thị "Checking..." khi class đã có task trong queue
- Icon RefreshCw quay liên tục để báo hiệu đang xử lý
- User không thể tạo thêm job mới cho cùng một class

**Xác nhận Xóa:**
- Xóa keyword(s): Hiện dialog "Delete X keywords? This action cannot be undone."
- Xóa project(s) từ multi-select: Hiện dialog tương tự
- Dialog hiển thị số lượng items sẽ bị xóa
- Button "Delete" chuyển thành "Deleting..." khi đang xử lý

