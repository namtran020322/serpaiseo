
## Kế hoạch Triển khai 4 Tính năng

---

### Tổng quan

| # | Tính năng | Độ phức tạp | Files thay đổi |
|---|-----------|-------------|----------------|
| 1 | Click Stat Card để Filter | Trung bình | 3 files |
| 2 | Header Actions (Credit, Bell, Avatar) | Trung bình | 2 files mới + 1 file sửa |
| 3 | SePay QR Modal (thay thế redirect) | Cao | 3 files |
| 4 | Projects Pagination | Cao | 4 files + 1 RPC |

---

### 1. Click Stat Card để Filter Keywords theo Tier

**Mục tiêu**: User click vào card thống kê (Top 1-3, Top 4-10,...) để lọc bảng keywords.

**Thay đổi:**

**A. `RankingStatsCards.tsx`** - Thêm props và click handler:
```tsx
interface RankingStatsCardsProps {
  stats: RankingStats;
  activeTier?: string | null;
  onTierClick?: (tier: string | null) => void;
}

// Card với cursor pointer và active state
<Card 
  className={cn(
    "cursor-pointer transition-colors hover:border-primary/50",
    activeTier === card.key && "ring-2 ring-primary"
  )}
  onClick={() => onTierClick?.(activeTier === card.key ? null : card.key)}
>
```

**B. `ClassDetail.tsx`** - Thêm state và truyền xuống:
```tsx
const [tierFilter, setTierFilter] = useState<string | null>(null);

<RankingStatsCards 
  stats={stats} 
  activeTier={tierFilter}
  onTierClick={setTierFilter}
/>

// Truyền tierFilter vào hook
useKeywordsPaginated({ classId, tierFilter, ... });
```

**C. `useKeywordsPaginated.ts`** - Thêm server-side filter:
```tsx
interface UseKeywordsPaginatedParams {
  // ... existing params
  tierFilter?: string | null;
}

// Trong queryFn:
if (tierFilter) {
  switch (tierFilter) {
    case 'top3':
      query = query.gte('ranking_position', 1).lte('ranking_position', 3);
      break;
    case 'top10':
      query = query.gte('ranking_position', 4).lte('ranking_position', 10);
      break;
    case 'top30':
      query = query.gte('ranking_position', 11).lte('ranking_position', 30);
      break;
    case 'top100':
      query = query.gte('ranking_position', 31).lte('ranking_position', 100);
      break;
    case 'notFound':
      query = query.or('ranking_position.is.null,ranking_position.gt.100');
      break;
  }
}
```

---

### 2. Header Actions - Credit Badge, Notification Bell, User Avatar

**Mục tiêu**: Thêm các thành phần vào header sau spacer: Credit Badge, Bell với Popover, Avatar với Dropdown.

**Files mới:**

**A. `src/components/HeaderActions.tsx`** - Component chính:

```tsx
import { Link, useNavigate } from "react-router-dom";
import { Bell, CreditCard, LogOut, Settings, Coins, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useHeaderAnnouncements } from "@/hooks/useHeaderAnnouncements";
import { formatCredits } from "@/lib/pricing";
import { formatDistanceToNow } from "date-fns";

export function HeaderActions() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthContext();
  const { balance } = useCredits();
  const { data: announcements } = useHeaderAnnouncements();
  
  const unreadCount = announcements?.length || 0;
  
  const handleSignOut = async () => { /* ... */ };
  
  const getUserInitials = () => {
    return user?.email?.substring(0, 2).toUpperCase() || "U";
  };
  
  return (
    <div className="flex items-center gap-3">
      {/* 1. Credit Badge */}
      <Link to="/dashboard/billing">
        <Badge variant="outline" className="gap-1.5 py-1 px-2.5 cursor-pointer hover:bg-accent">
          <Coins className="h-3.5 w-3.5" />
          {formatCredits(balance)}
        </Badge>
      </Link>
      
      {/* 2. Notification Bell */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="p-3 border-b">
            <h4 className="font-semibold text-sm">Notifications</h4>
          </div>
          <ScrollArea className="h-72">
            {announcements?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            ) : (
              announcements?.map((a) => (
                <div key={a.id} className="p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </ScrollArea>
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link to="/dashboard/notifications">View all notifications</Link>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* 3. User Avatar */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{user?.user_metadata?.full_name || 'User'}</span>
              <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
            <User className="mr-2 h-4 w-4" /> Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/dashboard/billing")}>
            <CreditCard className="mr-2 h-4 w-4" /> Billing
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

**B. `src/hooks/useHeaderAnnouncements.ts`** - Hook fetch notifications:
```tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export function useHeaderAnnouncements() {
  const { user } = useAuthContext();
  
  return useQuery({
    queryKey: ["header-announcements", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, content, type, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });
}
```

**C. `DashboardLayout.tsx`** - Import và sử dụng:
```tsx
import { HeaderActions } from "@/components/HeaderActions";

// Trong header, sau spacer:
<div className="flex-1" />
<HeaderActions />
```

---

### 3. SePay QR Modal thay vì Redirect

**Phát hiện quan trọng**: Theo tài liệu SePay, họ sử dụng **VietQR động** thay vì iframe. Phương pháp tốt nhất là:
1. Tạo order và lấy thông tin thanh toán (số tài khoản, số tiền, nội dung)
2. Hiển thị mã QR trong Modal
3. Polling kiểm tra trạng thái thanh toán mỗi 5 giây
4. Đóng modal khi thanh toán thành công

**Thay đổi:**

**A. Edge Function `create-sepay-order/index.ts`** - Trả về QR data thay vì form:
```typescript
// Thêm option để return QR data
const { package_id, display_mode } = body;

if (display_mode === 'qr') {
  // Return QR data for in-app display
  const qrUrl = `https://qr.sepay.vn/img?acc=${bankAccount}&bank=${bankName}&amount=${pkg.price}&des=${orderInvoiceNumber}`;
  
  return new Response(JSON.stringify({
    success: true,
    order_id: order.id,
    order_invoice_number: orderInvoiceNumber,
    qr_data: {
      qr_url: qrUrl,
      bank_name: 'Vietcombank', // From SePay config
      bank_account: bankAccount,
      account_name: 'CONG TY ABC',
      amount: pkg.price,
      description: orderInvoiceNumber,
      expire_on: expireOn,
    }
  }), { headers });
} else {
  // Existing redirect flow
  return new Response(JSON.stringify({
    checkout_action: '...',
    form_data: { ... }
  }), { headers });
}
```

**B. Tạo `src/components/PaymentQRModal.tsx`**:
```tsx
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Clock, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";

interface PaymentQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrData: {
    qr_url: string;
    bank_name: string;
    bank_account: string;
    account_name: string;
    amount: number;
    description: string;
    expire_on: string;
  } | null;
  orderId: string | null;
  onPaymentSuccess: () => void;
}

export function PaymentQRModal({ open, onOpenChange, qrData, orderId, onPaymentSuccess }: PaymentQRModalProps) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes countdown
  
  // Countdown timer
  useEffect(() => {
    if (!open || !qrData) return;
    const expireTime = new Date(qrData.expire_on).getTime();
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onOpenChange(false);
        toast({ variant: "destructive", title: "Payment expired" });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [open, qrData]);
  
  // Poll payment status every 5 seconds
  useEffect(() => {
    if (!open || !orderId) return;
    
    const interval = setInterval(async () => {
      setChecking(true);
      const { data } = await supabase
        .from("billing_orders")
        .select("status")
        .eq("id", orderId)
        .single();
      
      if (data?.status === 'paid') {
        clearInterval(interval);
        onPaymentSuccess();
        onOpenChange(false);
      }
      setChecking(false);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [open, orderId]);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  if (!qrData) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR to Pay</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4">
          {/* QR Code */}
          <div className="border rounded-lg p-4 bg-white">
            <img src={qrData.qr_url} alt="Payment QR" className="w-64 h-64" />
          </div>
          
          {/* Timer */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Expires in {formatTime(timeLeft)}</span>
            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          
          {/* Payment Info */}
          <div className="w-full space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Bank</span>
              <span className="font-medium">{qrData.bank_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Account</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{qrData.bank_account}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(qrData.bank_account)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-primary">{formatVND(qrData.amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Content</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{qrData.description}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(qrData.description)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Open your banking app, scan this QR code, and confirm payment. 
            The page will update automatically when payment is received.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**C. Cập nhật `Billing.tsx`**:
```tsx
import { PaymentQRModal } from "@/components/PaymentQRModal";

const [qrModalOpen, setQrModalOpen] = useState(false);
const [qrData, setQrData] = useState(null);
const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

const handlePurchase = async (packageId: string) => {
  setPurchaseLoading(packageId);
  
  const { data, error } = await supabase.functions.invoke('create-sepay-order', {
    body: { package_id: packageId, display_mode: 'qr' },
  });
  
  if (data?.qr_data) {
    setQrData(data.qr_data);
    setCurrentOrderId(data.order_id);
    setQrModalOpen(true);
  }
  
  setPurchaseLoading(null);
};

const handlePaymentSuccess = () => {
  toast({ title: "Payment successful!", description: "Credits have been added." });
  refreshCredits();
};

// Render modal
<PaymentQRModal
  open={qrModalOpen}
  onOpenChange={setQrModalOpen}
  qrData={qrData}
  orderId={currentOrderId}
  onPaymentSuccess={handlePaymentSuccess}
/>
```

**Lưu ý**: Cần xác nhận thông tin bank account từ cấu hình SePay (SEPAY_BANK_ACCOUNT, SEPAY_BANK_NAME secrets).

---

### 4. Server-side Pagination cho Projects

**Vấn đề hiện tại**: `useProjects()` tải TẤT CẢ projects, classes, và keywords trong 1 query. Với 50+ projects có hàng ngàn keywords, sẽ rất chậm.

**Giải pháp**: Tạo hook pagination riêng và RPC để aggregate stats.

**A. Database RPC `get_projects_paginated`**:
```sql
CREATE OR REPLACE FUNCTION get_projects_paginated(
  p_user_id uuid,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20,
  p_search text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total integer;
  v_projects jsonb;
BEGIN
  -- Count total
  SELECT COUNT(*) INTO v_total
  FROM projects
  WHERE user_id = p_user_id
    AND (p_search IS NULL OR name ILIKE '%' || p_search || '%');
  
  -- Get paginated projects with class counts
  SELECT jsonb_agg(row_to_json(p))
  INTO v_projects
  FROM (
    SELECT 
      pr.id,
      pr.name,
      pr.domain,
      pr.created_at,
      pr.updated_at,
      (SELECT COUNT(*) FROM project_classes WHERE project_id = pr.id) as class_count,
      (SELECT COUNT(*) FROM project_keywords pk 
       JOIN project_classes pc ON pk.class_id = pc.id 
       WHERE pc.project_id = pr.id) as keyword_count
    FROM projects pr
    WHERE pr.user_id = p_user_id
      AND (p_search IS NULL OR pr.name ILIKE '%' || p_search || '%')
    ORDER BY pr.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) p;
  
  RETURN jsonb_build_object(
    'total', v_total,
    'projects', COALESCE(v_projects, '[]'::jsonb)
  );
END;
$$;
```

**B. Hook `src/hooks/useProjectsPaginated.ts`**:
```tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

interface PaginatedProject {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  updated_at: string;
  class_count: number;
  keyword_count: number;
}

interface UseProjectsPaginatedParams {
  page: number;
  pageSize: number;
  search?: string;
}

export function useProjectsPaginated(params: UseProjectsPaginatedParams) {
  const { user } = useAuthContext();
  const { page, pageSize, search } = params;
  
  return useQuery({
    queryKey: ["projects-paginated", user?.id, page, pageSize, search],
    queryFn: async () => {
      if (!user) return { projects: [], total: 0 };
      
      const { data, error } = await supabase.rpc("get_projects_paginated", {
        p_user_id: user.id,
        p_offset: page * pageSize,
        p_limit: pageSize,
        p_search: search || null,
      });
      
      if (error) throw error;
      
      return {
        projects: (data?.projects || []) as PaginatedProject[],
        total: data?.total || 0,
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}
```

**C. Cập nhật `Projects.tsx`**:
```tsx
import { useProjectsPaginated } from "@/hooks/useProjectsPaginated";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

const [page, setPage] = useState(0);
const [pageSize, setPageSize] = useState(20);
const [search, setSearch] = useState("");

const { data, isLoading } = useProjectsPaginated({ page, pageSize, search });

// Render với pagination controls
<ProjectsTable 
  projects={data?.projects || []} 
  isLoading={isLoading} 
/>
<DataTablePagination
  page={page}
  pageSize={pageSize}
  totalCount={data?.total || 0}
  onPageChange={setPage}
  onPageSizeChange={setPageSize}
/>
```

**D. Cập nhật `ProjectsTable.tsx`** để nhận simplified project data (không có nested classes/keywords).

---

### Tóm tắt Files Thay đổi

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/components/projects/RankingStatsCards.tsx` | Edit | Thêm click handler, active state |
| `src/pages/ClassDetail.tsx` | Edit | Thêm tierFilter state |
| `src/hooks/useKeywordsPaginated.ts` | Edit | Thêm tierFilter param |
| `src/components/HeaderActions.tsx` | **New** | Credit + Bell + Avatar |
| `src/hooks/useHeaderAnnouncements.ts` | **New** | Fetch notifications |
| `src/layouts/DashboardLayout.tsx` | Edit | Import HeaderActions |
| `src/components/PaymentQRModal.tsx` | **New** | QR modal với polling |
| `src/pages/Billing.tsx` | Edit | Integrate QR modal |
| `supabase/functions/create-sepay-order/index.ts` | Edit | Return QR data option |
| `src/hooks/useProjectsPaginated.ts` | **New** | Server-side pagination |
| `src/pages/Projects.tsx` | Edit | Use paginated hook |
| `src/components/projects/ProjectsTable.tsx` | Edit | Adapt for paginated data |
| Database Migration | **New** | RPC `get_projects_paginated` |

---

### Thứ tự Triển khai Đề xuất

1. **Header Actions** (Feature 2) - Độc lập, không ảnh hưởng features khác
2. **Tier Filter Click** (Feature 1) - Cải thiện UX cho ClassDetail
3. **Projects Pagination** (Feature 4) - Cải thiện performance critical
4. **SePay QR Modal** (Feature 3) - Cần test với SePay sandbox

---

### Lưu ý Kỹ thuật

1. **SePay Integration**: Cần thêm secrets `SEPAY_BANK_ACCOUNT` và `SEPAY_BANK_NAME` để generate QR URL chính xác
2. **RLS**: RPC function cần `SECURITY DEFINER` và check `user_id` để đảm bảo bảo mật
3. **Caching**: Tất cả hooks sử dụng React Query với staleTime phù hợp để tránh over-fetching
