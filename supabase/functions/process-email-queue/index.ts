
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Dequeue messages
    const { data: messages, error: dequeueError } = await supabase.rpc('dequeue_email', { batch_size: 10 });

    if (dequeueError) {
      console.error('Dequeue error:', dequeueError);
      return new Response(JSON.stringify({ error: 'Failed to dequeue' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    let failed = 0;

    for (const msg of messages) {
      try {
        const payload = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
        
        // Send email via Lovable Email API
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (emailResponse.ok) {
          // Delete processed message
          await supabase.rpc('delete_email_message', { msg_id: msg.msg_id });
          processed++;
        } else {
          const errText = await emailResponse.text();
          console.error(`Failed to send email for msg ${msg.msg_id}:`, errText);
          failed++;
        }
      } catch (err) {
        console.error(`Error processing msg ${msg.msg_id}:`, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({ processed, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Process email queue error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
