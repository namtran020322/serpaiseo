import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2 } from "lucide-react";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast({
        variant: "destructive",
        title: "Đăng ký thất bại",
        description: error.message,
      });
    } else {
      toast({
        title: "Đăng ký thành công",
        description: "Chào mừng bạn đến với RankChecker!",
      });
      navigate("/dashboard");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Search className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Tạo tài khoản</CardTitle>
          <CardDescription>
            Đăng ký để bắt đầu kiểm tra thứ hạng từ khóa
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ và tên</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Đăng ký
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Đã có tài khoản?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Đăng nhập
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
