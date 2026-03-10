import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface UserListItem {
  id: string;
  email: string;
  full_name: string | null;
  balance: number;
  total_used: number;
  total_purchased: number;
  created_at: string;
  trial_status: { is_active: boolean; expires_at: string; credits_granted: number } | null;
}

Deno.serve(async (req) => {
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

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

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
    const action = url.searchParams.get('action');

    // GET /list-users
    if (req.method === 'GET' && action === 'list-users') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
      const search = url.searchParams.get('search') || '';

      const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
        page,
        perPage: pageSize,
      });

      if (authError) {
        return new Response(
          JSON.stringify({ error: 'Failed to list users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const users = authData.users || [];
      const userIds = users.map(u => u.id);

      const [{ data: profiles }, { data: credits }, { data: trials }] = await Promise.all([
        adminClient.from('profiles').select('user_id, full_name').in('user_id', userIds),
        adminClient.from('user_credits').select('user_id, balance, total_used, total_purchased').in('user_id', userIds),
        adminClient.from('trial_credits').select('user_id, is_active, expires_at, credits_granted').in('user_id', userIds),
      ]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const creditsMap = new Map(credits?.map(c => [c.user_id, c]) || []);
      const trialMap = new Map(trials?.map(t => [t.user_id, t]) || []);

      const result: UserListItem[] = users
        .filter(u => {
          if (!search) return true;
          const searchLower = search.toLowerCase();
          const profile = profileMap.get(u.id);
          return (
            u.email?.toLowerCase().includes(searchLower) ||
            profile?.full_name?.toLowerCase().includes(searchLower)
          );
        })
        .map(u => {
          const profile = profileMap.get(u.id);
          const credit = creditsMap.get(u.id);
          const trial = trialMap.get(u.id);
          return {
            id: u.id,
            email: u.email || '',
            full_name: profile?.full_name || null,
            balance: credit?.balance || 0,
            total_used: credit?.total_used || 0,
            total_purchased: credit?.total_purchased || 0,
            created_at: u.created_at,
            trial_status: trial ? {
              is_active: trial.is_active && new Date(trial.expires_at) > new Date(),
              expires_at: trial.expires_at,
              credits_granted: trial.credits_granted,
            } : null,
          };
        });

      return new Response(
        JSON.stringify({ users: result, total: authData.total || result.length, page, pageSize }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /user-history
    if (req.method === 'GET' && action === 'user-history') {
      const targetUserId = url.searchParams.get('userId');
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
      const offset = (page - 1) * pageSize;

      const { data: transactions, error: txError, count } = await adminClient
        .from('credit_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (txError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch transactions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ transactions: transactions || [], total: count || 0, page, pageSize }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /adjust-credits
    if (req.method === 'POST' && action === 'adjust-credits') {
      const body = await req.json();
      const { targetUserId, amount, reason, confirmation } = body;

      if (!targetUserId || amount === undefined || !reason) {
        return new Response(
          JSON.stringify({ error: 'targetUserId, amount, and reason are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (confirmation !== 'CONFIRM') {
        return new Response(
          JSON.stringify({ error: 'Confirmation required. Please type CONFIRM to proceed.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const adjustAmount = parseInt(amount);
      if (isNaN(adjustAmount) || adjustAmount === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid amount' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: currentCredits } = await adminClient
        .from('user_credits')
        .select('balance, total_purchased, total_used')
        .eq('user_id', targetUserId)
        .single();

      const currentBalance = currentCredits?.balance || 0;
      const newBalance = currentBalance + adjustAmount;

      if (newBalance < 0) {
        return new Response(
          JSON.stringify({ error: 'Resulting balance cannot be negative' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: upsertError } = await adminClient
        .from('user_credits')
        .upsert({
          user_id: targetUserId,
          balance: newBalance,
          total_purchased: (currentCredits?.total_purchased || 0) + (adjustAmount > 0 ? adjustAmount : 0),
          total_used: currentCredits?.total_used || 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update credits' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await adminClient.from('credit_transactions').insert({
        user_id: targetUserId,
        amount: adjustAmount,
        type: adjustAmount > 0 ? 'admin_add' : 'admin_deduct',
        description: `Admin adjustment: ${reason}`,
        balance_after: newBalance,
      });

      await adminClient.from('admin_actions_log').insert({
        admin_id: userId,
        action_type: 'credit_adjust',
        target_user_id: targetUserId,
        details: { amount: adjustAmount, reason, previous_balance: currentBalance, new_balance: newBalance },
      });

      return new Response(
        JSON.stringify({ success: true, previous_balance: currentBalance, new_balance: newBalance, adjustment: adjustAmount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /grant-trial
    if (req.method === 'POST' && action === 'grant-trial') {
      const body = await req.json();
      const { targetUserId, credits, durationValue, durationUnit, maxProjects, maxClassesPerProject } = body;

      if (!targetUserId || !credits || !durationValue || !durationUnit) {
        return new Response(
          JSON.stringify({ error: 'targetUserId, credits, durationValue, and durationUnit are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const creditsAmount = parseInt(credits);
      const duration = parseInt(durationValue);
      if (isNaN(creditsAmount) || creditsAmount <= 0 || isNaN(duration) || duration <= 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid credits or duration' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate expiration
      const expiresAt = new Date();
      if (durationUnit === 'hours') {
        expiresAt.setHours(expiresAt.getHours() + duration);
      } else {
        expiresAt.setDate(expiresAt.getDate() + duration);
      }

      // Upsert trial record
      const { error: trialError } = await adminClient
        .from('trial_credits')
        .upsert({
          user_id: targetUserId,
          credits_granted: creditsAmount,
          max_projects: maxProjects || 1,
          max_classes_per_project: maxClassesPerProject || 2,
          expires_at: expiresAt.toISOString(),
          granted_by: userId,
          is_active: true,
        }, { onConflict: 'user_id' });

      if (trialError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create trial' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add credits to user
      const { data: currentCredits } = await adminClient
        .from('user_credits')
        .select('balance, total_purchased, total_used')
        .eq('user_id', targetUserId)
        .single();

      const currentBalance = currentCredits?.balance || 0;
      const newBalance = currentBalance + creditsAmount;

      await adminClient.from('user_credits').upsert({
        user_id: targetUserId,
        balance: newBalance,
        total_purchased: currentCredits?.total_purchased || 0,
        total_used: currentCredits?.total_used || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      await adminClient.from('credit_transactions').insert({
        user_id: targetUserId,
        amount: creditsAmount,
        type: 'trial',
        description: `Trial credits: ${creditsAmount} credits for ${duration} ${durationUnit}`,
        balance_after: newBalance,
      });

      await adminClient.from('admin_actions_log').insert({
        admin_id: userId,
        action_type: 'grant_trial',
        target_user_id: targetUserId,
        details: { credits: creditsAmount, duration, durationUnit, maxProjects, maxClassesPerProject, expires_at: expiresAt.toISOString() },
      });

      return new Response(
        JSON.stringify({ success: true, expires_at: expiresAt.toISOString(), credits_added: creditsAmount, new_balance: newBalance }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /revoke-trial
    if (req.method === 'POST' && action === 'revoke-trial') {
      const body = await req.json();
      const { targetUserId } = body;

      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: 'targetUserId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await adminClient
        .from('trial_credits')
        .update({ is_active: false })
        .eq('user_id', targetUserId);

      await adminClient.from('admin_actions_log').insert({
        admin_id: userId,
        action_type: 'revoke_trial',
        target_user_id: targetUserId,
        details: {},
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-user-management:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
