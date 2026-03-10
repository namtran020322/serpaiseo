import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TrialGrantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; email: string } | null;
}

export function TrialGrantDialog({ open, onOpenChange, user }: TrialGrantDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [credits, setCredits] = useState("500");
  const [durationValue, setDurationValue] = useState("7");
  const [durationUnit, setDurationUnit] = useState<"hours" | "days">("days");
  const [maxProjects, setMaxProjects] = useState("1");
  const [maxClasses, setMaxClasses] = useState("2");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management?action=grant-trial`);
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: user.id,
          credits: parseInt(credits),
          durationValue: parseInt(durationValue),
          durationUnit,
          maxProjects: parseInt(maxProjects),
          maxClassesPerProject: parseInt(maxClasses),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to grant trial");
      }

      toast({ title: "Thành công", description: `Đã cấp trial cho ${user.email}` });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Lỗi", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cấp Trial Credits</DialogTitle>
          <DialogDescription>
            Cấp credits dùng thử cho {user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Số credits</Label>
            <Input
              type="number"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              min={1}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Thời hạn</Label>
              <Input
                type="number"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Đơn vị</Label>
              <Select value={durationUnit} onValueChange={(v) => setDurationUnit(v as "hours" | "days")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Giờ</SelectItem>
                  <SelectItem value="days">Ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Projects</Label>
              <Input
                type="number"
                value={maxProjects}
                onChange={(e) => setMaxProjects(e.target.value)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Classes/Project</Label>
              <Input
                type="number"
                value={maxClasses}
                onChange={(e) => setMaxClasses(e.target.value)}
                min={1}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cấp Trial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
