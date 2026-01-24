import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

interface UserCredits {
  id: string;
  user_id: string;
  balance: number;
  total_purchased: number;
  total_used: number;
  created_at: string;
  updated_at: string;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  reference_id: string | null;
  balance_after: number;
  created_at: string;
}

interface DailyUsageSummary {
  id: string;
  user_id: string;
  usage_date: string;
  total_keywords: number;
  total_credits: number;
  check_count: number;
  balance_end: number;
  created_at: string;
  updated_at: string;
}

interface BillingOrder {
  id: string;
  user_id: string;
  order_invoice_number: string;
  package_id: string;
  amount: number;
  credits: number;
  status: string;
  sepay_order_id: string | null;
  sepay_transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCredits() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const creditsQuery = useQuery({
    queryKey: ['user-credits', user?.id],
    queryFn: async (): Promise<UserCredits | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Query cho daily usage summary (thay thế usage transactions)
  const dailySummaryQuery = useQuery({
    queryKey: ['daily-usage-summary', user?.id],
    queryFn: async (): Promise<DailyUsageSummary[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('daily_usage_summary')
        .select('*')
        .eq('user_id', user.id)
        .order('usage_date', { ascending: false })
        .limit(30); // 30 ngày gần nhất
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Query cho purchase transactions (chỉ lấy loại purchase)
  const purchaseTransactionsQuery = useQuery({
    queryKey: ['purchase-transactions', user?.id],
    queryFn: async (): Promise<CreditTransaction[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'purchase')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const ordersQuery = useQuery({
    queryKey: ['billing-orders', user?.id],
    queryFn: async (): Promise<BillingOrder[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('billing_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const refreshCredits = () => {
    queryClient.invalidateQueries({ queryKey: ['user-credits', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['daily-usage-summary', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['purchase-transactions', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['billing-orders', user?.id] });
  };

  return {
    credits: creditsQuery.data,
    balance: creditsQuery.data?.balance ?? 0,
    totalPurchased: creditsQuery.data?.total_purchased ?? 0,
    totalUsed: creditsQuery.data?.total_used ?? 0,
    isLoading: creditsQuery.isLoading,
    // Daily usage summary (gom nhóm theo ngày)
    dailySummary: dailySummaryQuery.data ?? [],
    dailySummaryLoading: dailySummaryQuery.isLoading,
    // Purchase transactions
    purchaseTransactions: purchaseTransactionsQuery.data ?? [],
    purchaseTransactionsLoading: purchaseTransactionsQuery.isLoading,
    // Orders
    orders: ordersQuery.data ?? [],
    ordersLoading: ordersQuery.isLoading,
    refreshCredits,
  };
}
