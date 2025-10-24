// supabase/functions/_shared/cors.ts

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allows any origin (good for localhost testing)
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}