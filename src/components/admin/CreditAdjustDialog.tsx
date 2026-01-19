import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UserInfo {
  id: string;
  email: string;
  full_name: string | null;
  balance: number;
}

interface CreditAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserInfo | null;
}

export function CreditAdjustDialog({
  open,
  onOpenChange,
  user,
}: CreditAdjustDialogProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const queryClient = useQueryClient();

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("admin-user-management", {
        body: {
          targetUserId: user?.id,
          amount: parseInt(amount),
          reason,
          confirmation: confirmText,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Đã ${parseInt(amount) > 0 ? "cộng" : "trừ"} ${Math.abs(parseInt(amount))} credits. Số dư mới: ${data.new_balance}`
      );
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể điều chỉnh credits");
    },
  });

  const handleClose = () => {
    setAmount("");
    setReason("");
    setConfirmText("");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reason || confirmText !== "CONFIRM") return;
    adjustMutation.mutate();
  };

  const parsedAmount = parseInt(amount) || 0;
  const newBalance = (user?.balance || 0) + parsedAmount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Điều chỉnh Credits</DialogTitle>
          <DialogDescription>
            Cộng hoặc trừ credits cho{" "}
            <span className="font-medium text-foreground">{user?.email}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Số dư hiện tại</Label>
                <div className="text-2xl font-bold">{user?.balance || 0}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Số dư mới</Label>
                <div className={`text-2xl font-bold ${newBalance < 0 ? "text-destructive" : ""}`}>
                  {newBalance}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Số lượng điều chỉnh</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ví dụ: 100 hoặc -50"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Số dương để cộng, số âm để trừ
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Lý do</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Đền bù lỗi hệ thống / Tặng quà khuyến mãi"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">
                Nhập <span className="font-mono font-bold">CONFIRM</span> để xác nhận
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="CONFIRM"
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={
                !amount ||
                parsedAmount === 0 ||
                !reason ||
                confirmText !== "CONFIRM" ||
                newBalance < 0 ||
                adjustMutation.isPending
              }
            >
              {adjustMutation.isPending ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
