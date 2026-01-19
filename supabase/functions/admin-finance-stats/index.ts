import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyRevenue {
  date: string;
  amount: number;
  orders: number;
}

interface MonthlyRevenue {
  month: string;
  amount: number;
  orders: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Create admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await adminClient.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    // Get paid orders for the specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: paidOrders, error: ordersError } = await adminClient
      .from('billing_orders')
      .select('amount, credits, paid_at, created_at')
      .eq('status', 'paid')
      .gte('paid_at', startDate.toISOString())
      .order('paid_at', { ascending: true });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aggregate daily revenue
    const dailyMap = new Map<string, { amount: number; orders: number }>();
    for (const order of paidOrders || []) {
      const date = new Date(order.paid_at!).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { amount: 0, orders: 0 };
      dailyMap.set(date, {
        amount: existing.amount + order.amount,
        orders: existing.orders + 1,
      });
    }

    const dailyRevenue: DailyRevenue[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate monthly revenue
    const monthlyMap = new Map<string, { amount: number; orders: number }>();
    for (const order of paidOrders || []) {
      const month = new Date(order.paid_at!).toISOString().slice(0, 7); // YYYY-MM
      const existing = monthlyMap.get(month) || { amount: 0, orders: 0 };
      monthlyMap.set(month, {
        amount: existing.amount + order.amount,
        orders: existing.orders + 1,
      });
    }

    const monthlyRevenue: MonthlyRevenue[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Get total credits stats
    const { data: creditStats, error: creditError } = await adminClient
      .from('user_credits')
      .select('total_purchased, total_used');

    if (creditError) {
      console.error('Error fetching credit stats:', creditError);
    }

    const totalPurchased = creditStats?.reduce((sum, c) => sum + (c.total_purchased || 0), 0) || 0;
    const totalUsed = creditStats?.reduce((sum, c) => sum + (c.total_used || 0), 0) || 0;
    const burnRate = totalPurchased > 0 ? Math.round((totalUsed / totalPurchased) * 100) : 0;

    // Calculate totals
    const totalRevenue = (paidOrders || []).reduce((sum, o) => sum + o.amount, 0);
    const totalOrders = paidOrders?.length || 0;
    const totalCredits = (paidOrders || []).reduce((sum, o) => sum + o.credits, 0);

    return new Response(
      JSON.stringify({
        summary: {
          totalRevenue,
          totalOrders,
          totalCredits,
          period: `Last ${days} days`,
        },
        daily: dailyRevenue,
        monthly: monthlyRevenue,
        credits: {
          totalPurchased,
          totalUsed,
          burnRate,
          burnRateMessage: burnRate < 50 
            ? 'Low usage rate'
            : burnRate < 80 
            ? 'Moderate usage rate'
            : 'High usage rate',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-finance-stats:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
