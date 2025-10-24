// supabase/functions/create-pilot-with-user/index.ts (v12-debug)

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts' 

interface RequestPayload {
  pilotData: { name: string; category?: string; baseFee: number; closingDate: number; observations?: string; };
  userData: { email: string; password?: string; };
}

function createAdminClient(): SupabaseClient {
    console.log('[DEBUG][createAdminClient] Tentando criar cliente admin...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
         console.error('[DEBUG][createAdminClient] ERRO: Variáveis de ambiente ausentes!');
         throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidas.');
    }
    console.log('[DEBUG][createAdminClient] Cliente admin criado com sucesso.');
    return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

Deno.serve(async (req) => {
  console.log(`[DEBUG][Deno.serve] Recebido request: ${req.method} ${req.url}`); // Log inicial

  // Tratamento CORS Preflight
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG][Deno.serve] Respondendo OPTIONS com headers CORS.');
    return new Response('ok', { headers: corsHeaders });
  }

  let newUserId: string | null = null 
  let newPilotId: string | null = null 

  try {
    // --- 1. Validação e Setup ---
    if (req.method !== 'POST') {
         console.error('[DEBUG][Deno.serve] ERRO: Método não é POST.');
         throw new Error('Método não permitido. Use POST.');
    }
     console.log('[DEBUG][Deno.serve] Lendo corpo JSON...');
    const payload: RequestPayload = await req.json();
    console.log('[DEBUG][Deno.serve] Payload recebido:', payload);
    const { pilotData, userData } = payload;

    if (!pilotData || !userData || !pilotData.name || !userData.email || typeof pilotData.baseFee !== 'number' || typeof pilotData.closingDate !== 'number') {
         console.error('[DEBUG][Deno.serve] ERRO: Payload inválido ou incompleto.');
         throw new Error('Dados incompletos. Forneça pelo menos nome, email, mensalidade(número) e data de fechamento(número).');
    }

    const supabaseAdmin = createAdminClient(); // Chama a função auxiliar com logs

    // --- 2. Criar Usuário no Supabase Auth ---
    const password = userData.password || crypto.randomUUID().substring(0, 12); 
    console.log(`[DEBUG][Deno.serve] Tentando criar usuário Auth para ${userData.email}...`);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: password,
      email_confirm: false, // Simplificado para teste, pode mudar para true depois
    });

    if (authError) {
      console.error('[DEBUG][Deno.serve] ERRO ao criar usuário Auth:', authError.message, authError); // Log completo do erro
      if (authError.message.includes('duplicate key value') || authError.message.includes('already registered')) {
          throw new Error(`O email ${userData.email} já está em uso.`);
      }
      throw new Error(`Erro ao criar conta de login: ${authError.message}`);
    }
    if (!authData?.user?.id) {
         console.error('[DEBUG][Deno.serve] ERRO: Usuário Auth criado, mas ID não retornado.', authData);
         throw new Error('Usuário Auth criado, mas ID não retornado.');
    }
    newUserId = authData.user.id;
    console.log(`[DEBUG][Deno.serve] Usuário Auth ${newUserId} criado com sucesso.`);

    // --- 3. Criar Registro na Tabela 'pilots' ---
    console.log(`[DEBUG][Deno.serve] Tentando criar piloto ${pilotData.name}...`);
    const { data: pilotResult, error: pilotError } = await supabaseAdmin
      .from('pilots')
      .insert({
        name: pilotData.name,
        category: pilotData.category || null,
        baseFee: pilotData.baseFee,
        closingDate: pilotData.closingDate,
        observations: pilotData.observations || null,
      })
      .select('id') 
      .single(); 

     if (pilotError || !pilotResult?.id) {
       console.error('[DEBUG][Deno.serve] ERRO ao criar piloto:', pilotError?.message || 'ID não retornado', pilotError); // Log completo
       if (newUserId) {
           console.warn(`[DEBUG][Deno.serve] Rollback: deletando usuário Auth ${newUserId}...`);
           await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(err => console.error('[DEBUG] Falha no rollback do Auth User:', err));
       }
       throw new Error(`Erro ao salvar dados do piloto: ${pilotError?.message || 'ID não retornado'}`);
     }
     newPilotId = pilotResult.id;
     console.log(`[DEBUG][Deno.serve] Piloto ${newPilotId} criado com sucesso.`);

    // --- 4. Criar Registro na Tabela 'profiles' ---
    console.log(`[DEBUG][Deno.serve] Tentando criar profile para user ${newUserId} e pilot ${newPilotId}...`);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserId, 
        role: 'piloto',
        pilot_id: newPilotId, 
      });

    if (profileError) {
      console.error('[DEBUG][Deno.serve] ERRO ao criar profile:', profileError.message, profileError); // Log completo
       if (newPilotId) { 
            console.warn(`[DEBUG][Deno.serve] Rollback: deletando piloto ${newPilotId}...`);
            await supabaseAdmin.from('pilots').delete().eq('id', newPilotId).catch(err => console.error('[DEBUG] Falha no rollback do Piloto:', err));
       }
       if (newUserId) { 
            console.warn(`[DEBUG][Deno.serve] Rollback: deletando usuário Auth ${newUserId}...`);
            await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(err => console.error('[DEBUG] Falha no rollback do Auth User:', err));
       }
      throw new Error(`Erro ao vincular perfil: ${profileError.message}`);
    }
    console.log(`[DEBUG][Deno.serve] Profile criado com sucesso.`);

    // --- 5. Sucesso ---
    const successMessage = `Piloto ${pilotData.name} e conta para ${userData.email} criados com sucesso.` +
                           (!userData.password ? ` Senha temporária: ${password}` : '');
     console.log('[DEBUG][Deno.serve] Operação concluída com sucesso. Retornando 201.');
    return new Response(JSON.stringify({ message: successMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 201, 
    });

  } catch (error) {
    console.error('[DEBUG][Deno.serve] ERRO GERAL:', error.message, error); // Log completo do erro
    // Rollback (simplificado - apenas Auth User se ID existe)
     if (newUserId && !error.message.includes('Erro ao criar conta de login')) { 
         try {
             const supabaseAdminRollback = createAdminClient();
             console.warn(`[DEBUG][Deno.serve] Rollback por erro: deletando usuário Auth ${newUserId}...`);
             await supabaseAdminRollback.auth.admin.deleteUser(newUserId);
         } catch(rollbackError){
              console.error('[DEBUG][Deno.serve] Falha no rollback do Auth User:', rollbackError);
              error.message += ` (Falha no rollback: ${rollbackError.message})`;
         }
     }

    console.log('[DEBUG][Deno.serve] Retornando erro para o cliente.');
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: error.message.includes('já está em uso') ? 409 : (error.message.includes('Dados incompletos') || error.message.includes('Método não permitido') ? 400 : 500), 
    });
  }
})