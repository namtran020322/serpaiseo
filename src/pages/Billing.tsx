import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Coins, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, Loader2, Zap, Star, Check, Users, Shield, BarChart3, RefreshCw } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PRICING_PACKAGES, formatVND, formatCredits, getUserTier } from "@/lib/pricing";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const { balance, totalPurchased, totalUsed, isLoading, dailySummary, dailySummaryLoading, purchaseTransactions, purchaseTransactionsLoading, orders, ordersLoading, refreshCredits } = useCredits();
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

  const currentTier = getUserTier(totalPurchased);

  // Handle payment result from redirect
  useEffect(() => {
    const paymentResult = searchParams.get('payment');
    if (paymentResult) {
      if (paymentResult === 'success') {
        toast({
          title: "Payment processing",
          description: "Your payment is being processed. Credits will be added shortly.",
        });
        refreshCredits();
      } else if (paymentResult === 'error') {
        toast({
          variant: "destructive",
          title: "Payment failed",
          description: "There was an error processing your payment. Please try again.",
        });
      } else if (paymentResult === 'cancel') {
        toast({
          title: "Payment cancelled",
          description: "Your payment was cancelled.",
        });
      }
      // Clear the search params
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, refreshCredits]);

  const handlePurchase = async (packageId: string) => {
    if (!user) return;
    
    setPurchaseLoading(packageId);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-sepay-order', {
        body: { package_id: packageId },
      });

      if (error) throw error;

      // Redirect trực tiếp đến SePay thay vì mở modal
      if (data?.checkout_action && data?.form_data) {
        // Tạo form ẩn và submit để redirect toàn trang
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.checkout_action;
        
        // Thêm fields theo đúng thứ tự SePay yêu cầu
        const fieldOrder = [
          'merchant', 'currency', 'order_amount', 'operation',
          'order_description', 'order_invoice_number',
          'success_url', 'error_url', 'cancel_url', 'signature'
        ];
        
        fieldOrder.forEach(key => {
          if (data.form_data[key]) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = data.form_data[key];
            form.appendChild(input);
          }
        });
        
        document.body.appendChild(form);
        form.submit(); // Redirect toàn trang đến SePay checkout
      } else {
        throw new Error('Invalid response from payment service');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        variant: "destructive",
        title: "Purchase failed",
        description: error.message || "Unable to create order. Please try again.",
      });
      setPurchaseLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'cancelled':
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === 'purchase' || amount > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getFeatures = (pkgId: string) => {
    const baseFeatures = [
      { icon: Check, text: "Unlimited keywords" },
      { icon: BarChart3, text: "Ranking history & charts" },
      { icon: RefreshCw, text: "Auto-check scheduling" },
      { icon: Shield, text: "SERP data accuracy" },
    ];
    
    return baseFeatures;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-2">
          Manage your credits and view transaction history
        </p>
      </div>

      {/* Credit Balance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Coins className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="text-3xl font-bold text-primary">{formatCredits(balance)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">credits available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="text-3xl font-bold text-green-600">{formatCredits(totalPurchased)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">credits lifetime</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Used</CardTitle>
            <TrendingDown className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="text-3xl font-bold text-orange-600">{formatCredits(totalUsed)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">credits consumed</p>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Packages - Reference-inspired Design */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
          <p className="text-muted-foreground">Select the perfect plan for your SEO tracking needs</p>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-3">
          {PRICING_PACKAGES.map((pkg) => {
            const isCurrentTier = currentTier === pkg.id;
            const isPro = pkg.popular;
            
            return (
              <Card 
                key={pkg.id} 
                className={cn(
                  "relative flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl",
                  isPro && "border-2 border-primary shadow-lg scale-[1.02]",
                  isCurrentTier && "ring-2 ring-primary/50"
                )}
              >
                {/* Popular Badge */}
                {isPro && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold rounded-bl-lg">
                      MOST POPULAR
                    </div>
                  </div>
                )}
                
                {/* Current Tier Badge */}
                {isCurrentTier && (
                  <div className="absolute top-0 left-0">
                    <div className="bg-green-500 text-white px-3 py-1 text-xs font-semibold rounded-br-lg">
                      CURRENT
                    </div>
                  </div>
                )}
                
                <CardHeader className={cn(
                  "text-center pb-4 pt-8",
                  isPro && "bg-gradient-to-br from-primary/5 to-primary/10"
                )}>
                  <CardTitle className="text-xl font-bold">{pkg.name}</CardTitle>
                  
                  {/* Price */}
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold">{formatVND(pkg.price)}</span>
                  </div>
                  
                  {/* Credits Highlight */}
                  <div className={cn(
                    "mt-4 py-3 px-4 rounded-lg",
                    isPro ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <div className="text-2xl font-bold">{formatCredits(pkg.credits)}</div>
                    <div className={cn(
                      "text-sm",
                      isPro ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      credits
                    </div>
                  </div>
                  
                  {/* Price per credit */}
                  <p className="text-sm text-muted-foreground mt-2">
                    ~{pkg.pricePerCredit.toFixed(1)}đ per credit
                  </p>
                </CardHeader>
                
                <CardContent className="flex-1 pt-4">
                  {/* Features List */}
                  <ul className="space-y-3">
                    {/* Competitor Limit - Highlighted */}
                    <li className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                      <Users className="h-5 w-5 text-primary shrink-0" />
                      <span className="font-medium">
                        Up to <strong className="text-primary">{pkg.maxCompetitors}</strong> competitors per class
                      </span>
                    </li>
                    
                    {getFeatures(pkg.id).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <feature.icon className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-sm">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="pt-4 pb-6">
                  <Button 
                    className={cn(
                      "w-full h-12 text-base font-semibold",
                      isPro && "bg-primary hover:bg-primary/90"
                    )}
                    size="lg"
                    variant={isPro ? "default" : "outline"}
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchaseLoading !== null}
                  >
                    {purchaseLoading === pkg.id ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        {isCurrentTier ? 'Buy More' : 'Get Started'}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Credit Usage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Credit Usage
          </CardTitle>
          <CardDescription>How credits are calculated for each ranking check</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">50</div>
              <div>
                <div className="font-semibold">Top 50 Check</div>
                <div className="text-sm text-muted-foreground">5 credits per keyword</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">100</div>
              <div>
                <div className="font-semibold">Top 100 Check</div>
                <div className="text-sm text-muted-foreground">10 credits per keyword</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Credit usage (grouped by day) and purchases</CardDescription>
            </CardHeader>
            <CardContent>
              {(dailySummaryLoading || purchaseTransactionsLoading) ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (dailySummary.length === 0 && purchaseTransactions.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet
                </div>
              ) : (
                <AllTransactionsTable 
                  purchaseTransactions={purchaseTransactions}
                  dailySummary={dailySummary}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>Your credit purchase orders</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No orders yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          {order.order_invoice_number}
                        </TableCell>
                        <TableCell className="capitalize">
                          {order.package_id}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatVND(order.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCredits(order.credits)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Component AllTransactionsTable - merge và sort theo ngày
interface AllTransactionsTableProps {
  purchaseTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string | null;
    balance_after: number;
    created_at: string;
  }>;
  dailySummary: Array<{
    id: string;
    usage_date: string;
    total_keywords: number;
    total_credits: number;
    check_count: number;
    balance_end: number;
  }>;
}

function AllTransactionsTable({ purchaseTransactions, dailySummary }: AllTransactionsTableProps) {
  // Merge và sort tất cả transactions theo ngày giảm dần
  const allTransactions = useMemo(() => {
    const purchaseItems = purchaseTransactions.map(tx => ({
      type: 'purchase' as const,
      date: new Date(tx.created_at),
      data: tx,
    }));
    
    const usageItems = dailySummary.map(day => ({
      type: 'usage' as const,
      date: new Date(day.usage_date),
      data: day,
    }));
    
    return [...purchaseItems, ...usageItems].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [purchaseTransactions, dailySummary]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Balance After</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {allTransactions.map((item) => {
          if (item.type === 'purchase') {
            const tx = item.data;
            return (
              <TableRow key={`purchase-${tx.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="capitalize">{tx.type}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {tx.description || '-'}
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  +{formatCredits(tx.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCredits(tx.balance_after)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(tx.created_at), 'dd/MM/yyyy')}
                </TableCell>
              </TableRow>
            );
          } else {
            const day = item.data;
            return (
              <TableRow key={`usage-${day.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span>Usage</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  Checked {formatCredits(day.total_keywords)} keywords ({day.check_count} {day.check_count > 1 ? 'checks' : 'check'})
                </TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  -{formatCredits(day.total_credits)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCredits(day.balance_end)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(day.usage_date), 'dd/MM/yyyy')}
                </TableCell>
              </TableRow>
            );
          }
        })}
      </TableBody>
    </Table>
  );
}
