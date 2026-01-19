import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const xmlriverUserId = Deno.env.get('XMLRIVER_USER_ID')!;
    const xmlriverApiKey = Deno.env.get('XMLRIVER_API_KEY')!;

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Use getUser instead of getClaims for proper token validation
    const { data: userData, error: userError } = await userClient.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

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

    // Fetch XMLRiver balance
    console.log('Fetching XMLRiver balance...');
    const balanceResponse = await fetch(
      `https://xmlriver.com/api/get_balance/?user=${xmlriverUserId}&key=${xmlriverApiKey}`
    );
    
    if (!balanceResponse.ok) {
      console.error('XMLRiver balance fetch failed:', balanceResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch SERP API balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const balanceText = await balanceResponse.text();
    const balance = parseFloat(balanceText);
    console.log('XMLRiver balance:', balance);

    // Fetch XMLRiver cost per 1000 queries
    console.log('Fetching XMLRiver cost...');
    const costResponse = await fetch(
      `https://xmlriver.com/api/get_cost/google/?user=${xmlriverUserId}&key=${xmlriverApiKey}`
    );

    if (!costResponse.ok) {
      console.error('XMLRiver cost fetch failed:', costResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch SERP API cost' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const costText = await costResponse.text();
    const costPer1000 = parseFloat(costText);
    console.log('XMLRiver cost per 1000:', costPer1000);

    // Calculate total available credits from XMLRiver
    // Formula: (balance / costPer1000) * 1000
    const totalXmlriverCredits = costPer1000 > 0 ? Math.floor((balance / costPer1000) * 1000) : 0;
    console.log('Total XMLRiver credits available:', totalXmlriverCredits);

    // Get total user credits from database
    const { data: allUserCredits, error: creditsError } = await adminClient
      .from('user_credits')
      .select('balance');

    if (creditsError) {
      console.error('Error fetching user credits:', creditsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalUserCredits = allUserCredits?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0;
    console.log('Total user credits:', totalUserCredits);

    // Calculate coverage percentage
    // How many user credits can be fulfilled with XMLRiver balance
    const coveragePercentage = totalUserCredits > 0 
      ? Math.min(100, Math.round((totalXmlriverCredits / totalUserCredits) * 100))
      : 100;

    // Determine coverage status
    let coverageStatus: 'healthy' | 'warning' | 'critical';
    if (coveragePercentage >= 100) {
      coverageStatus = 'healthy';
    } else if (coveragePercentage >= 50) {
      coverageStatus = 'warning';
    } else {
      coverageStatus = 'critical';
    }

    return new Response(
      JSON.stringify({
        xmlriver: {
          balance: balance,
          costPer1000: costPer1000,
          totalCreditsAvailable: totalXmlriverCredits,
        },
        users: {
          totalCredits: totalUserCredits,
        },
        coverage: {
          percentage: coveragePercentage,
          status: coverageStatus,
          message: coveragePercentage >= 100 
            ? 'Sufficient balance to cover all user credits'
            : coveragePercentage >= 50
            ? 'Balance is running low, consider topping up soon'
            : 'Critical: Balance insufficient to cover user credits',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-xmlriver-stats:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
