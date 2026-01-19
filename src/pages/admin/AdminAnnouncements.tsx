import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Bell, Trash2, Edit, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmActionDialog } from "@/components/admin/ConfirmActionDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  target_type: string;
  target_user_ids: string[];
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

export default function AdminAnnouncements() {
  const [page, setPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("info");
  const [targetType, setTargetType] = useState("all");
  const [isActive, setIsActive] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-announcements", page],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-announcements`);
      url.searchParams.set("action", "list");
      url.searchParams.set("page", page.toString());
      url.searchParams.set("pageSize", "20");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch announcements");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-announcements`);
      url.searchParams.set("action", "create");

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          type,
          target_type: targetType,
          is_active: isActive,
        }),
      });

      if (!res.ok) throw new Error("Failed to create announcement");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Đã tạo thông báo");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      resetForm();
      setCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể tạo thông báo");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-announcements`);
      url.searchParams.set("action", "update");

      const res = await fetch(url.toString(), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingAnnouncement?.id,
          title,
          content,
          type,
          target_type: targetType,
          is_active: isActive,
        }),
      });

      if (!res.ok) throw new Error("Failed to update announcement");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Đã cập nhật thông báo");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      resetForm();
      setEditingAnnouncement(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể cập nhật thông báo");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-announcements`);
      url.searchParams.set("action", "delete");

      const res = await fetch(url.toString(), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, confirmation: "CONFIRM" }),
      });

      if (!res.ok) throw new Error("Failed to delete announcement");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Đã xóa thông báo");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      setDeleteConfirmOpen(false);
      setDeletingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể xóa thông báo");
    },
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setType("info");
    setTargetType("all");
    setIsActive(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setType(announcement.type);
    setTargetType(announcement.target_type);
    setIsActive(announcement.is_active);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "warning":
        return <Badge variant="destructive">Warning</Badge>;
      case "success":
        return <Badge className="bg-green-500">Success</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý Thông báo</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo thông báo
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Đối tượng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : data?.announcements?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Chưa có thông báo nào
                </TableCell>
              </TableRow>
            ) : (
              data?.announcements?.map((announcement: Announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell className="font-medium">{announcement.title}</TableCell>
                  <TableCell>{getTypeBadge(announcement.type)}</TableCell>
                  <TableCell>
                    {announcement.target_type === "all" ? "Tất cả" : "Riêng biệt"}
                  </TableCell>
                  <TableCell>
                    {announcement.is_active ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Eye className="h-3 w-3 mr-1" />
                        Hiển thị
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Ẩn
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(announcement.created_at), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(announcement)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(announcement.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa
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
          Tổng: {data?.total || 0} thông báo
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Trước
          </Button>
          <Button variant="outline" size="sm" disabled={!data?.announcements?.length || data.announcements.length < 20} onClick={() => setPage(p => p + 1)}>
            Sau
          </Button>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen || !!editingAnnouncement} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditingAnnouncement(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? "Chỉnh sửa thông báo" : "Tạo thông báo mới"}
            </DialogTitle>
            <DialogDescription>
              Thông báo sẽ hiển thị trên Dashboard của users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Bảo trì hệ thống"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Nội dung</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ví dụ: Hệ thống sẽ bảo trì từ 12h - 14h ngày 20/01"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loại thông báo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Đối tượng</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả users</SelectItem>
                    <SelectItem value="specific">Users cụ thể</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is-active">Hiển thị thông báo</Label>
              <Switch
                id="is-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              setEditingAnnouncement(null);
              resetForm();
            }}>
              Hủy
            </Button>
            <Button 
              onClick={() => editingAnnouncement ? updateMutation.mutate() : createMutation.mutate()}
              disabled={!title || !content || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmActionDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Xóa thông báo"
        description="Bạn có chắc chắn muốn xóa thông báo này? Hành động này không thể hoàn tác."
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
