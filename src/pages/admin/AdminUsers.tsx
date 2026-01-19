import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Search, History, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditAdjustDialog } from "@/components/admin/CreditAdjustDialog";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  balance: number;
  total_used: number;
  total_purchased: number;
  created_at: string;
}

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("admin-user-management", {
        body: {},
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });

      // Build URL manually for GET request
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`);
      url.searchParams.set("action", "list-users");
      url.searchParams.set("page", page.toString());
      url.searchParams.set("pageSize", "20");
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const handleAdjustCredits = (user: User) => {
    setSelectedUser(user);
    setAdjustDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý Users</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm email hoặc tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead className="text-right">Số dư</TableHead>
              <TableHead className="text-right">Đã dùng</TableHead>
              <TableHead className="text-right">Đã mua</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : data?.users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy user nào
                </TableCell>
              </TableRow>
            ) : (
              data?.users?.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.full_name || "-"}</TableCell>
                  <TableCell className="text-right font-mono">{user.balance.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{user.total_used.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{user.total_purchased.toLocaleString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAdjustCredits(user)}>
                          <Coins className="h-4 w-4 mr-2" />
                          Điều chỉnh Credits
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <History className="h-4 w-4 mr-2" />
                          Xem lịch sử
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Tổng: {data?.total || 0} users
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Trước
          </Button>
          <Button variant="outline" size="sm" disabled={!data?.users?.length || data.users.length < 20} onClick={() => setPage(p => p + 1)}>
            Sau
          </Button>
        </div>
      </div>

      <CreditAdjustDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        user={selectedUser}
      />
    </div>
  );
}
