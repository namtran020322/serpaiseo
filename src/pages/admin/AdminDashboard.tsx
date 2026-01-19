import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, TrendingUp, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const [financeRes, xmlriverRes] = await Promise.all([
        supabase.functions.invoke("admin-finance-stats", {
          body: {},
          headers: { Authorization: `Bearer ${session.session.access_token}` },
        }),
        supabase.functions.invoke("admin-xmlriver-stats", {
          body: {},
          headers: { Authorization: `Bearer ${session.session.access_token}` },
        }),
      ]);

      return {
        finance: financeRes.data,
        xmlriver: xmlriverRes.data,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu (30 ngày)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.finance?.summary?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.finance?.summary?.totalOrders || 0} đơn hàng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SERP API Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.xmlriver?.xmlriver?.balance?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              ~{stats?.xmlriver?.xmlriver?.totalCreditsAvailable?.toLocaleString() || 0} credits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              stats?.xmlriver?.coverage?.status === "critical" ? "text-destructive" :
              stats?.xmlriver?.coverage?.status === "warning" ? "text-yellow-600" : ""
            }`}>
              {stats?.xmlriver?.coverage?.percentage || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.xmlriver?.users?.totalCredits?.toLocaleString() || 0} user credits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ sử dụng</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.finance?.credits?.burnRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.finance?.credits?.totalUsed?.toLocaleString() || 0} / {stats?.finance?.credits?.totalPurchased?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
