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

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // GET /list - List all announcements
    if (req.method === 'GET' && action === 'list') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
      const offset = (page - 1) * pageSize;

      const { data: announcements, error, count } = await adminClient
        .from('announcements')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('Error fetching announcements:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch announcements' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          announcements: announcements || [],
          total: count || 0,
          page,
          pageSize,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /create - Create a new announcement
    if (req.method === 'POST' && action === 'create') {
      const body = await req.json();
      const { title, content, type, target_type, target_user_ids, is_active, starts_at, expires_at } = body;

      if (!title || !content) {
        return new Response(
          JSON.stringify({ error: 'Title and content are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: announcement, error } = await adminClient
        .from('announcements')
        .insert({
          title,
          content,
          type: type || 'info',
          target_type: target_type || 'all',
          target_user_ids: target_user_ids || [],
          is_active: is_active !== false,
          starts_at: starts_at || new Date().toISOString(),
          expires_at: expires_at || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating announcement:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create announcement' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log admin action
      await adminClient.from('admin_actions_log').insert({
        admin_id: userId,
        action_type: 'announcement_create',
        details: { announcement_id: announcement.id, title },
      });

      return new Response(
        JSON.stringify({ success: true, announcement }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /update - Update an announcement
    if (req.method === 'PUT' && action === 'update') {
      const body = await req.json();
      const { id, ...updates } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Announcement ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: announcement, error } = await adminClient
        .from('announcements')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating announcement:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update announcement' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log admin action
      await adminClient.from('admin_actions_log').insert({
        admin_id: userId,
        action_type: 'announcement_update',
        details: { announcement_id: id, updates },
      });

      return new Response(
        JSON.stringify({ success: true, announcement }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /delete - Delete an announcement (requires CONFIRM)
    if (req.method === 'DELETE' && action === 'delete') {
      const body = await req.json();
      const { id, confirmation } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Announcement ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (confirmation !== 'CONFIRM') {
        return new Response(
          JSON.stringify({ error: 'Confirmation required. Please type CONFIRM to proceed.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await adminClient
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting announcement:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to delete announcement' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log admin action
      await adminClient.from('admin_actions_log').insert({
        admin_id: userId,
        action_type: 'announcement_delete',
        details: { announcement_id: id },
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
    console.error('Error in admin-announcements:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
