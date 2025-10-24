import { createClient, SupabaseClient, PostgrestError, AuthError } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Interface para os dados esperados do frontend
interface RequestPayload {
  pilotData: {
    name: string;
    category?: string;
    baseFee: number;
    closingDate: number;
    observations?: string;
  };
  userData: {
    email: string;
    password?: string; // Senha é opcional, podemos gerar uma temporária
  };
}

// Função auxiliar para criar cliente Admin
function createAdminClient(): SupabaseClient {
  // ... (código idêntico ao da função delete-pilot-full)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Variáveis de ambiente ausentes.')
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

Deno.serve(async (req) => {
  // Tratamento CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let newUserId: string | null = null // Guardar ID do usuário criado para rollback
  let newPilotId: string | null = null // Guardar ID do piloto criado para rollback

  try {
    // --- 1. Validação e Setup ---
    if (req.method !== 'POST') throw new Error('Método não permitido.')
    const payload: RequestPayload = await req.json()
    const { pilotData, userData } = payload

    // Validação básica
    if (!pilotData || !userData || !pilotData.name || !userData.email || !pilotData.baseFee || !pilotData.closingDate) {
      throw new Error('Dados incompletos. Forneça pelo menos nome, email, mensalidade e data de fechamento.')
    }

    const supabaseAdmin = createAdminClient()
    console.log('[create-pilot] Cliente Admin criado.')

    // --- 2. Criar Usuário no Supabase Auth ---
    // Gerar senha temporária se não for fornecida (mais seguro)
    const password = userData.password || crypto.randomUUID().substring(0, 12); // Senha aleatória de 12 chars
    console.log(`[create-pilot] Tentando criar usuário Auth para ${userData.email}...`)

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: password,
      email_confirm: true, // Ou false se não quiser confirmação
      // Você pode adicionar user_metadata aqui se precisar
    })

    if (authError) {
      console.error('[create-pilot] Erro ao criar usuário Auth:', authError.message)
      // Mapeia erro comum para mensagem amigável
      if (authError.message.includes('duplicate key value violates unique constraint')) {
          throw new Error(`O email ${userData.email} já está em uso.`);
      }
      throw new Error(`Erro ao criar conta de login: ${authError.message}`)
    }
    if (!authData?.user?.id) {
       throw new Error('Usuário Auth criado, mas ID não retornado.')
    }
    newUserId = authData.user.id
    console.log(`[create-pilot] Usuário Auth ${newUserId} criado com sucesso.`)


    // --- 3. Criar Registro na Tabela 'pilots' ---
    console.log(`[create-pilot] Tentando criar piloto ${pilotData.name}...`)
    const { data: pilotResult, error: pilotError } = await supabaseAdmin
      .from('pilots')
      .insert({
        name: pilotData.name,
        category: pilotData.category,
        baseFee: pilotData.baseFee,
        closingDate: pilotData.closingDate,
        observations: pilotData.observations,
      })
      .select('id') // Pede para retornar o ID do piloto criado
      .single() // Espera um único resultado

     if (pilotError || !pilotResult?.id) {
       console.error('[create-pilot] Erro ao criar piloto:', pilotError?.message || 'ID do piloto não retornado')
       // Tentar rollback: Deletar o usuário Auth recém-criado
       if (newUserId) {
           console.warn(`[create-pilot] Tentando rollback: deletar usuário Auth ${newUserId}...`)
           await supabaseAdmin.auth.admin.deleteUser(newUserId);
       }
       throw new Error(`Erro ao salvar dados do piloto: ${pilotError?.message || 'ID não retornado'}`)
     }
     newPilotId = pilotResult.id
     console.log(`[create-pilot] Piloto ${newPilotId} criado com sucesso.`)


    // --- 4. Criar Registro na Tabela 'profiles' ---
    console.log(`[create-pilot] Tentando criar profile para user ${newUserId} e pilot ${newPilotId}...`)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserId, // Liga ao usuário Auth
        role: 'piloto',
        pilot_id: newPilotId, // Liga ao piloto
      })

    if (profileError) {
      console.error('[create-pilot] Erro ao criar profile:', profileError.message)
       // Tentar rollback: Deletar piloto e usuário Auth
       if (newPilotId) await supabaseAdmin.from('pilots').delete().eq('id', newPilotId);
       if (newUserId) await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(`Erro ao vincular perfil: ${profileError.message}`)
    }
    console.log(`[create-pilot] Profile criado com sucesso.`)


    // --- 5. Sucesso ---
    // Retorna mensagem indicando sucesso e a senha (se foi gerada)
    const successMessage = `Piloto ${pilotData.name} e conta para ${userData.email} criados com sucesso.` +
                           (!userData.password ? ` Senha temporária: ${password}` : '');

    return new Response(JSON.stringify({ message: successMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // 201 Created
    })

  } catch (error) {
    console.error('[create-pilot] Erro geral na função:', error)
    // Se algo falhou, tenta garantir que o usuário Auth (se criado) seja deletado
     if (newUserId && !error.message.includes('Erro ao criar usuário Auth')) { // Evita tentar deletar se a criação já falhou
         try {
             const supabaseAdminRollback = createAdminClient();
             console.warn(`[create-pilot] Rollback por erro: deletando usuário Auth ${newUserId}...`)
             await supabaseAdminRollback.auth.admin.deleteUser(newUserId);
         } catch(rollbackError){
              console.error('[create-pilot] Falha ao tentar fazer rollback do usuário Auth:', rollbackError);
              // Adiciona info do erro de rollback à mensagem original
              error.message += ` (Falha no rollback do usuário: ${rollbackError.message})`;
         }
     }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.includes('já está em uso') ? 409 : 500, // 409 Conflict se email duplicado
    })
  }
})