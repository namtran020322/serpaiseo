import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, History, BarChart3, ArrowRight } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuthContext();
  const userName = user?.user_metadata?.full_name || "bạn";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Xin chào, {userName}!</h1>
        <p className="text-muted-foreground mt-2">
          Chào mừng bạn đến với RankChecker - công cụ kiểm tra thứ hạng từ khóa trên Google.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow border-primary/20">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Kiểm tra thứ hạng</CardTitle>
            <CardDescription>
              Nhập từ khóa và URL để kiểm tra vị trí trên Google SERP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full group">
              <Link to="/dashboard/rank-checker">
                Bắt đầu kiểm tra
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <History className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Lịch sử kiểm tra</CardTitle>
            <CardDescription>
              Xem lại các kết quả kiểm tra thứ hạng trước đó
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full group">
              <Link to="/dashboard/history">
                Xem lịch sử
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Thống kê</CardTitle>
            <CardDescription>
              Phân tích xu hướng thứ hạng từ khóa theo thời gian
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full group">
              <Link to="/dashboard/analytics">
                Xem thống kê
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hướng dẫn sử dụng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              1
            </div>
            <div>
              <h4 className="font-medium">Nhập từ khóa cần kiểm tra</h4>
              <p className="text-sm text-muted-foreground">
                Nhập từ khóa bạn muốn kiểm tra thứ hạng trên Google
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              2
            </div>
            <div>
              <h4 className="font-medium">Chọn vị trí và ngôn ngữ</h4>
              <p className="text-sm text-muted-foreground">
                Chọn quốc gia, thành phố và ngôn ngữ để có kết quả chính xác nhất
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              3
            </div>
            <div>
              <h4 className="font-medium">Nhập URL cần tìm (tùy chọn)</h4>
              <p className="text-sm text-muted-foreground">
                Nhập domain hoặc URL cụ thể để tìm vị trí trong kết quả tìm kiếm
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              4
            </div>
            <div>
              <h4 className="font-medium">Xem kết quả</h4>
              <p className="text-sm text-muted-foreground">
                Nhận kết quả chi tiết về thứ hạng và các trang web xếp hạng cao
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
