// supabase/functions/create-pilot-with-user/index.ts (v13-fix-update)

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts' 

interface RequestPayload {
  pilotData: { name: string; category?: string; baseFee: number; closingDate: number; observations?: string; };
  userData: { email: string; password?: string; };
}

function createAdminClient(): SupabaseClient {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) { throw new Error('Variáveis de ambiente ausentes.'); }
    return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

Deno.serve(async (req) => {
  // console.log(`[DEBUG][Deno.serve] Recebido request: ${req.method} ${req.url}`); 

  // CORS Preflight
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

  let newUserId: string | null = null 
  let newPilotId: string | null = null 

  try {
    // --- 1. Validação e Setup ---
    if (req.method !== 'POST') { throw new Error('Método não permitido.'); }
    const payload: RequestPayload = await req.json();
    const { pilotData, userData } = payload;
    if (!pilotData || !userData || !pilotData.name || !userData.email || typeof pilotData.baseFee !== 'number' || typeof pilotData.closingDate !== 'number') {
        throw new Error('Dados incompletos.');
    }
    const supabaseAdmin = createAdminClient(); 

    // --- 2. Criar Usuário no Supabase Auth ---
    // REMOVEMOS email_confirm daqui, deixamos o Supabase criar como "não confirmado"
    const password = userData.password || crypto.randomUUID().substring(0, 12); 
    console.log(`[create-pilot] Tentando criar usuário Auth para ${userData.email}...`);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: password,
      // email_confirm: false, // REMOVIDO DAQUI
    });

    if (authError) {
      console.error('[create-pilot] ERRO ao criar usuário Auth:', authError.message, authError); 
      if (authError.message.includes('duplicate key value') || authError.message.includes('already registered')) { throw new Error(`O email ${userData.email} já está em uso.`); }
      throw new Error(`Erro ao criar conta de login: ${authError.message}`);
    }
    if (!authData?.user?.id) { throw new Error('Usuário Auth criado, mas ID não retornado.'); }
    newUserId = authData.user.id;
    console.log(`[create-pilot] Usuário Auth ${newUserId} criado (ainda não confirmado).`);

    // ***** PASSO ADICIONAL: Confirmar o Email Via Update *****
    console.log(`[create-pilot] Tentando confirmar email para ${newUserId} via update...`);
    const { error: updateConfirmError } = await supabaseAdmin.auth.admin.updateUserById(
        newUserId,
        { email_confirm: true } // Define explicitamente como confirmado
    );

    if (updateConfirmError) {
        console.error(`[create-pilot] ERRO ao tentar confirmar email para ${newUserId}:`, updateConfirmError.message, updateConfirmError);
        // Tentar rollback do usuário recém-criado
        if (newUserId) { await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(err => console.error('[create-pilot] Falha rollback Auth User pós-erro de confirmação:', err)); }
        throw new Error(`Erro ao confirmar email do usuário: ${updateConfirmError.message}`);
    }
    console.log(`[create-pilot] Email para ${newUserId} confirmado com sucesso via update.`);
    // ***** FIM DO PASSO ADICIONAL *****


    // --- 3. Criar Registro na Tabela 'pilots' ---
    console.log(`[create-pilot] Tentando criar piloto ${pilotData.name}...`);
    const { data: pilotResult, error: pilotError } = await supabaseAdmin
      .from('pilots')
      .insert({ /* ... dados do piloto ... */
        name: pilotData.name, category: pilotData.category || null, baseFee: pilotData.baseFee,
        closingDate: pilotData.closingDate, observations: pilotData.observations || null,
      })
      .select('id') 
      .single(); 

     if (pilotError || !pilotResult?.id) {
       console.error('[create-pilot] ERRO ao criar piloto:', pilotError?.message || 'ID não retornado', pilotError); 
       if (newUserId) { /* ... rollback Auth ... */ await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(err => console.error('[create-pilot] Falha rollback Auth User:', err)); }
       throw new Error(`Erro ao salvar dados do piloto: ${pilotError?.message || 'ID não retornado'}`);
     }
     newPilotId = pilotResult.id;
     console.log(`[create-pilot] Piloto ${newPilotId} criado com sucesso.`);

    // --- 4. Criar Registro na Tabela 'profiles' ---
    console.log(`[create-pilot] Tentando criar profile para user ${newUserId} e pilot ${newPilotId}...`);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: newUserId, role: 'piloto', pilot_id: newPilotId });

    if (profileError) {
      console.error('[create-pilot] ERRO ao criar profile:', profileError.message, profileError); 
       if (newPilotId) { /* ... rollback Pilot ... */ await supabaseAdmin.from('pilots').delete().eq('id', newPilotId).catch(err => console.error('[create-pilot] Falha rollback Piloto:', err)); }
       if (newUserId) { /* ... rollback Auth ... */ await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(err => console.error('[create-pilot] Falha rollback Auth User:', err)); }
      throw new Error(`Erro ao vincular perfil: ${profileError.message}`);
    }
    console.log(`[create-pilot] Profile criado com sucesso.`);

    // --- 5. Sucesso ---
    const successMessage = `Piloto ${pilotData.name} e conta para ${userData.email} criados com sucesso.` +
                           (!userData.password ? ` Senha temporária: ${password}` : '');
     console.log('[create-pilot] Operação concluída. Retornando 201.');
    return new Response(JSON.stringify({ message: successMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 201, 
    });

  } catch (error) {
    console.error('[create-pilot] ERRO GERAL:', error.message, error); 
    // Rollback (simplificado)
     if (newUserId && !error.message.includes('Erro ao criar conta de login')) { 
         try { /* ... tenta deletar Auth User ... */ } catch(rollbackError){ /* ... loga erro rollback ... */ }
     }
    console.log('[create-pilot] Retornando erro para o cliente.');
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: error.message.includes('já está em uso') ? 409 : (error.message.includes('Dados incompletos') || error.message.includes('Método não permitido') ? 400 : 500), 
    });
  }
})