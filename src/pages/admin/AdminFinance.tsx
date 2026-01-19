import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, DollarSign, TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function AdminFinance() {
  const { data: financeData, isLoading: financeLoading, refetch: refetchFinance } = useQuery({
    queryKey: ["admin-finance-stats"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("admin-finance-stats", {
        body: {},
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });

      if (res.error) throw res.error;
      return res.data;
    },
  });

  const { data: xmlriverData, isLoading: xmlriverLoading, refetch: refetchXmlriver } = useQuery({
    queryKey: ["admin-xmlriver-stats"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("admin-xmlriver-stats", {
        body: {},
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });

      if (res.error) throw res.error;
      return res.data;
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  const isLoading = financeLoading || xmlriverLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Tài chính & Credits</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const coverageStatus = xmlriverData?.coverage?.status;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tài chính & Credits</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchFinance();
            refetchXmlriver();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* SERP API Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SERP API Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${xmlriverData?.xmlriver?.balance?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Cost: ${xmlriverData?.xmlriver?.costPer1000?.toFixed(2) || "0"} / 1000 queries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {xmlriverData?.xmlriver?.totalCreditsAvailable?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              credits có thể sử dụng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">User Credits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {xmlriverData?.users?.totalCredits?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              tổng credits của users
            </p>
          </CardContent>
        </Card>

        <Card className={coverageStatus === "critical" ? "border-destructive" : coverageStatus === "warning" ? "border-yellow-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            {coverageStatus === "healthy" ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className={`h-4 w-4 ${coverageStatus === "critical" ? "text-destructive" : "text-yellow-500"}`} />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              coverageStatus === "critical" ? "text-destructive" :
              coverageStatus === "warning" ? "text-yellow-600" : "text-green-600"
            }`}>
              {xmlriverData?.coverage?.percentage || 0}%
            </div>
            <Progress 
              value={Math.min(100, xmlriverData?.coverage?.percentage || 0)} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {xmlriverData?.coverage?.message}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu (30 ngày)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(financeData?.summary?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financeData?.summary?.totalOrders || 0} đơn hàng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credits đã bán</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financeData?.summary?.totalCredits?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">trong 30 ngày qua</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ sử dụng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{financeData?.credits?.burnRate || 0}%</div>
              <Badge variant={
                financeData?.credits?.burnRate < 50 ? "secondary" :
                financeData?.credits?.burnRate < 80 ? "default" : "destructive"
              }>
                {financeData?.credits?.burnRateMessage}
              </Badge>
            </div>
            <Progress value={financeData?.credits?.burnRate || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {financeData?.credits?.totalUsed?.toLocaleString() || 0} / {financeData?.credits?.totalPurchased?.toLocaleString() || 0} credits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Doanh thu theo ngày</CardTitle>
            <CardDescription>30 ngày gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {financeData?.daily?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={financeData.daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Doanh thu"]}
                    labelFormatter={(label) => `Ngày: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Chưa có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Doanh thu theo tháng</CardTitle>
            <CardDescription>Các tháng gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {financeData?.monthly?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={financeData.monthly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Doanh thu"]}
                    labelFormatter={(label) => `Tháng: ${label}`}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Chưa có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
