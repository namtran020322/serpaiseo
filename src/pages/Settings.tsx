import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, User, Key, Save, Loader2 } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể cập nhật thông tin",
      });
    } else {
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin cá nhân",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cài đặt</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý thông tin tài khoản và cài đặt ứng dụng
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Thông tin cá nhân</CardTitle>
            </div>
            <CardDescription>
              Cập nhật thông tin tài khoản của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên"
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Lưu thay đổi
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>API Credentials</CardTitle>
            </div>
            <CardDescription>
              Cấu hình API key để sử dụng tính năng kiểm tra thứ hạng thực
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Để sử dụng tính năng kiểm tra thứ hạng với dữ liệu thực từ Google,
                  bạn cần có tài khoản XMLRiver API. Liên hệ admin để được cấu hình.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
