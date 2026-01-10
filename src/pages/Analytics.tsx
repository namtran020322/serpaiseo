import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Search, Target } from "lucide-react";

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Thống kê</h1>
        <p className="text-muted-foreground mt-2">
          Phân tích xu hướng thứ hạng từ khóa theo thời gian
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng kiểm tra</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Tổng số lần kiểm tra</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top 10</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Từ khóa trong top 10</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tăng hạng</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Từ khóa tăng hạng</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trung bình</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Vị trí trung bình</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ thứ hạng</CardTitle>
          <CardDescription>
            Theo dõi sự thay đổi thứ hạng từ khóa theo thời gian
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Chưa có dữ liệu</p>
              <p className="text-sm text-muted-foreground">
                Bắt đầu kiểm tra thứ hạng để xem biểu đồ thống kê
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
