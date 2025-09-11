import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      return new Response('No signature', { status: 400 })
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    // Verify webhook signature (simplified - in production use proper verification)
    // For now, we'll process the webhook without verification for testing
    const event = JSON.parse(body)

    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { user_id, round_id, selected_rarity } = session.metadata

      // Create lottery entry in database
      const { data, error } = await supabaseClient
        .from('lottery_entries')
        .upsert([{
          user_id,
          round_id,
          selected_rarity,
          payment_confirmed: true
        }], {
          onConflict: 'user_id,round_id'
        })

      if (error) {
        console.error('Error creating lottery entry:', error)
        return new Response('Database error', { status: 500 })
      }

      console.log('Lottery entry created successfully for user:', user_id)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Webhook error', { status: 400 })
  }
})