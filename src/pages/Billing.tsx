import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Coins, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, Loader2, Zap, Star, Check, Users } from "lucide-react";
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
  const { balance, totalPurchased, totalUsed, isLoading, transactions, transactionsLoading, orders, ordersLoading, refreshCredits } = useCredits();
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

      if (data?.checkout_action && data?.form_data) {
        // Create hidden form and submit via POST
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.checkout_action;
        form.style.display = 'none';
        
        // Add all form fields as hidden inputs
        Object.entries(data.form_data).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });
        
        document.body.appendChild(form);
        form.submit();
        // Don't reset loading state since page will redirect
        return;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-2">
          Manage your credits and view transaction history
        </p>
      </div>

      {/* Credit Balance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-primary">{formatCredits(balance)} credits</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatCredits(totalPurchased)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Used</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatCredits(totalUsed)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pricing Packages - Redesigned */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Buy Credits</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          {PRICING_PACKAGES.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={cn(
                "relative flex flex-col transition-all",
                pkg.popular && "border-primary shadow-lg ring-2 ring-primary/20",
                currentTier === pkg.id && "bg-primary/5"
              )}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary shadow-sm">
                    <Star className="h-3 w-3 mr-1" /> Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2 pt-6">
                <CardTitle className="text-xl">{pkg.name}</CardTitle>
                <div className="text-3xl font-bold mt-2">{formatVND(pkg.price)}</div>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-4">
                {/* Credits - Main Feature */}
                <div className="text-center py-4 bg-primary/5 rounded-lg">
                  <div className="text-3xl font-bold text-primary">
                    {formatCredits(pkg.credits)}
                  </div>
                  <div className="text-sm text-muted-foreground">credits</div>
                </div>
                
                {/* Features List */}
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>~{pkg.pricePerCredit.toFixed(1)}đ / credit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <span><strong>{pkg.maxCompetitors}</strong> competitor domains</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Unlimited keywords</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Ranking history</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Auto-check scheduling</span>
                  </li>
                </ul>
              </CardContent>
              
              <CardFooter className="pt-0">
                <Button 
                  className="w-full" 
                  size="lg"
                  variant={pkg.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchaseLoading !== null}
                >
                  {purchaseLoading === pkg.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Buy Now
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Credit Usage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Credit Usage</CardTitle>
          <CardDescription>How credits are calculated for each ranking check</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">50</div>
              <div>
                <div className="font-medium">Top 50 Check</div>
                <div className="text-sm text-muted-foreground">5 credits per keyword</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">100</div>
              <div>
                <div className="font-medium">Top 100 Check</div>
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
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your credit usage and purchase history</CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet
                </div>
              ) : (
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
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(tx.type, tx.amount)}
                            <span className="capitalize">{tx.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tx.description || '-'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{formatCredits(tx.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCredits(tx.balance_after)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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