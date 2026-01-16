import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Coins, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, Loader2, Zap, Star } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PRICING_PACKAGES, formatVND, formatCredits } from "@/lib/pricing";
import { format } from "date-fns";

export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const { balance, totalPurchased, totalUsed, isLoading, transactions, transactionsLoading, orders, ordersLoading, refreshCredits } = useCredits();
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

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

      {/* Credit Balance */}
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

      {/* Pricing Packages */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Buy Credits</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PRICING_PACKAGES.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative ${pkg.popular ? 'border-primary shadow-lg' : ''}`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">
                    <Star className="h-3 w-3 mr-1" /> Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pt-6">
                <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{formatVND(pkg.price)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">{formatCredits(pkg.credits)}</div>
                  <div className="text-sm text-muted-foreground">credits</div>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  ~{pkg.pricePerCredit.toFixed(2)}đ / credit
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Credit Usage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Credit Usage</CardTitle>
          <CardDescription>How credits are calculated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-muted rounded-lg">
              <div className="font-medium">Top 50 Check</div>
              <div className="text-sm text-muted-foreground">5 credits per keyword</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="font-medium">Top 100 Check</div>
              <div className="text-sm text-muted-foreground">10 credits per keyword</div>
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
