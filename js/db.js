// js/db.js

const DB = {

    /**
     * Busca pilotos.
     * RLS filtra automaticamente: Admin vê todos, Piloto vê apenas o seu.
     */
    async getPilots() {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

        const { data: pilots, error } = await supabase
            .from('pilots')
            .select(`
                *,
                expenses ( * ),
                reimbursements ( * )
            `)
            .gte('expenses.created_at', firstDayOfMonth)
            .lte('expenses.created_at', lastDayOfMonth)
            .gte('reimbursements.created_at', firstDayOfMonth)
            .lte('reimbursements.created_at', lastDayOfMonth)
            .order('name'); 

        if (error) {
            console.error('Erro ao buscar pilotos e transações:', error.message);
            return [];
        }
        return pilots;
    },

    /**
     * Busca um único piloto pelo ID (Função de Admin).
     */
    async getPilotById(id) {
        const { data, error } = await supabase
            .from('pilots')
            .select('*')
            .eq('id', id)
            .single(); 

        if (error) {
            console.error('Erro ao buscar piloto por ID:', error.message);
            return null;
        }
        return data;
    },

    /**
     * ATUALIZADO: Apenas ATUALIZA um piloto existente (Função de Admin).
     */
    async updatePilot(pilotData) {
        // Garante que temos um ID para atualizar
        if (!pilotData.id) {
             throw new Error("ID do piloto é necessário para atualização.");
        }
        
        const dataToSave = {
            name: pilotData.name,
            category: pilotData.category || null, // Garante null se vazio
            baseFee: parseFloat(pilotData.baseFee),
            closingDate: parseInt(pilotData.closingDate),
            observations: pilotData.observations || null // Garante null se vazio
        };

        const { error } = await supabase
            .from('pilots')
            .update(dataToSave)
            .eq('id', pilotData.id);

        if (error) {
            console.error('Erro ao ATUALIZAR piloto:', error.message);
            throw new Error(error.message); 
        }
         console.log(`[DB.updatePilot] Piloto ${pilotData.id} atualizado.`);
    },

    /**
     * NOVO: Chama a Edge Function para criar Piloto + Usuário Auth + Profile (Função de Admin).
     */
    async createPilotAndUser(pilotData, userData) {
        console.log(`[DB.createPilotAndUser] Chamando Edge Function 'create-pilot-with-user'...`);
        const { data, error } = await supabase.functions.invoke(
            'create-pilot-with-user',
            {
                body: { 
                    // Garante que os dados enviados estão corretos
                    pilotData: {
                         name: pilotData.name,
                         category: pilotData.category || null,
                         baseFee: parseFloat(pilotData.baseFee),
                         closingDate: parseInt(pilotData.closingDate),
                         observations: pilotData.observations || null
                    }, 
                    userData: {
                        email: userData.email,
                        password: userData.password || undefined // Envia undefined se vazio
                    } 
                }, 
            }
        )

        if (error) {
            console.error('[DB.createPilotAndUser] Erro retornado pela Edge Function invoke:', error.message);
             let errorMessage = error.message;
             if (error.context && typeof error.context.json === 'function') {
                 try { const errorJson = await error.context.json(); if (errorJson && errorJson.error) { errorMessage = errorJson.error; } } catch(e) {}
             }
             throw new Error(errorMessage); 
        }
        
        if (data && data.error) {
             console.error('[DB.createPilotAndUser] Erro na lógica da Edge Function:', data.error);
             throw new Error(data.error);
        }

        console.log('[DB.createPilotAndUser] Resposta da Edge Function:', data);
        return data.message || "Operação concluída com sucesso."; 
    },


    /**
     * Deleta um piloto e sua conta (chama Edge Function 'delete-pilot-full').
     */
    async deletePilot(pilotId) {
        console.log(`[DB.deletePilot] Chamando Edge Function 'delete-pilot-full' para pilotId: ${pilotId}`);
        const { data, error } = await supabase.functions.invoke('delete-pilot-full', { body: { pilot_id: pilotId } });
        if (error) {
            console.error('[DB.deletePilot] Erro retornado pela Edge Function invoke:', error.message);
            let errorMessage = error.message;
            if (error.context && typeof error.context.json === 'function') { try { const errorJson = await error.context.json(); if (errorJson && errorJson.error) { errorMessage = errorJson.error; } } catch(e) {} }
             throw new Error(errorMessage);
        }
        if (data && data.error) { console.error('[DB.deletePilot] Erro na lógica da Edge Function:', data.error); throw new Error(data.error); }
        console.log('[DB.deletePilot] Resposta da Edge Function:', data);
    },

    /**
     * Calcula os totais
     */
    calculateTotals(pilot) {
        const expenses = pilot.expenses || []; 
        const reimbursements = pilot.reimbursements || [];
        
        const totalExpenses = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const totalReimbursements = reimbursements.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const totalMonth = parseFloat(pilot.baseFee || 0) + totalExpenses - totalReimbursements; 

        return {
            totalExpenses,
            totalReimbursements,
            totalMonth
        };
    },

    /**
     * Adiciona um novo gasto extra.
     */
    async addExpense(pilotId, description, amount) { 
        const { error } = await supabase.from('expenses').insert({ pilot_id: pilotId, description: description, amount: parseFloat(amount) }); 
        if (error) { console.error('Erro ao adicionar gasto:', error.message); throw new Error(error.message); } 
    },

    /**
     * Adiciona um novo reembolso.
     */
    async addReimbursement(pilotId, description, amount) { 
        const { error } = await supabase.from('reimbursements').insert({ pilot_id: pilotId, description: description, amount: parseFloat(amount) }); 
        if (error) { console.error('Erro ao adicionar reembolso:', error.message); throw new Error(error.message); } 
    },

    /**
     * Busca o histórico de fechamentos de um piloto.
     */
    async getHistory(pilotId) { 
        const { data, error } = await supabase.from('closing_history').select('*').eq('pilot_id', pilotId).order('month_reference', { ascending: false }); 
        if (error) { console.error('Erro ao buscar histórico:', error.message); throw new Error(`Falha ao buscar histórico: ${error.message}`); } 
        return data || []; 
    },

    /**
     * Pega a URL pública de um PDF no Storage.
     */
    getPdfUrl(pdfPath) { 
        const { data } = supabase.storage.from('fechamentos').getPublicUrl(pdfPath); 
        if (!data || !data.publicUrl) { console.error('Erro ao gerar URL pública:', pdfPath); return null; } 
        return data.publicUrl; 
    },


    // --- LÓGICA DE FECHAMENTO (Função de Admin) ---

    async checkAutoClosing() {
        console.log("Verificando fechamentos automáticos...");
        const today = new Date().getDate(); 
        const currentMonthRef = new Date().toISOString().slice(0, 7); 

        const { data: pilots, error: pilotsError } = await supabase
            .from('pilots')
            .select('id, name, closingDate');

        if (pilotsError) {
             console.error('Erro ao buscar pilotos para checkAutoClosing:', pilotsError.message);
             return;
        }

        const { data: history, error: historyError } = await supabase
            .from('closing_history')
            .select('pilot_id')
            .eq('month_reference', currentMonthRef);
        
        if (historyError) {
            console.error('Erro ao buscar histórico para checkAutoClosing:', historyError.message);
            return;
        }

        const closedPilots = new Set(history.map(h => h.pilot_id));
        let wasClosed = false;

        for (const pilot of pilots) {
            const closingDay = parseInt(pilot.closingDate, 10);
            if (isNaN(closingDay)) {
                console.warn(`Piloto ${pilot.name} (${pilot.id}) tem closingDate inválido: ${pilot.closingDate}`);
                continue; 
            }
            
            const alreadyClosed = closedPilots.has(pilot.id);

            if (closingDay === today && !alreadyClosed) {
                console.log(`Iniciando fechamento para ${pilot.name}...`);
                try {
                    await this.performClosing(pilot.id);
                    console.log(`Fechamento de ${pilot.name} concluído.`);
                    wasClosed = true;
                } catch (err) {
                    console.error(`Falha no fechamento de ${pilot.name}:`, err);
                }
            }
        }
    },

    async performClosing(pilotId) {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
        const currentMonthRef = today.toISOString().slice(0, 7);

        const { data: pilot, error } = await supabase
            .from('pilots')
            .select(`*, expenses(*), reimbursements(*)`)
            .eq('id', pilotId)
            .gte('expenses.created_at', firstDayOfMonth)
            .lte('expenses.created_at', lastDayOfMonth)
            .gte('reimbursements.created_at', firstDayOfMonth)
            .lte('reimbursements.created_at', lastDayOfMonth)
            .single();

        if (error) throw new Error(`Erro ao buscar dados do piloto para fechar (${pilotId}): ${error.message}`);
        if (!pilot) throw new Error(`Piloto com ID ${pilotId} não encontrado para fechamento.`);


        const totals = this.calculateTotals(pilot);

        // Gera o PDF como um Blob
        const pdfBlob = await PDF.generateReport(pilot, totals); 
         if (!(pdfBlob instanceof Blob)) {
             throw new Error('Função generateReport não retornou um Blob válido.');
         }

        // Faz Upload do PDF para o Supabase Storage
        const safePilotName = (pilot.name || 'piloto_sem_nome').replace(/[^a-zA-Z0-9]/g, '_'); 
        const filePath = `${pilot.id}/${currentMonthRef}_${safePilotName}.pdf`;
        
        console.log(`[performClosing] Fazendo upload do PDF para: ${filePath}`);
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('fechamentos') 
            .upload(filePath, pdfBlob, {
                contentType: 'application/pdf',
                upsert: true 
            });

        if (uploadError) throw new Error(`Erro ao fazer upload do PDF para ${filePath}: ${uploadError.message}`);
        if (!uploadData || !uploadData.path) {
             throw new Error(`Upload do PDF bem sucedido, mas não retornou o path: ${JSON.stringify(uploadData)}`);
        }

        console.log(`[performClosing] PDF salvo em: ${uploadData.path}. Salvando histórico...`);

        // Registra o fechamento na tabela 'closing_history'
        const { error: historyError } = await supabase
            .from('closing_history')
            .insert({
                pilot_id: pilot.id,
                month_reference: currentMonthRef,
                total_amount: totals.totalMonth,
                pdf_path: uploadData.path 
            });
        
        if (historyError) {
             console.error(`Erro ao salvar histórico (${historyError.message}). Tentando remover PDF ${uploadData.path}...`);
             await supabase.storage.from('fechamentos').remove([uploadData.path]);
             throw new Error(`Erro ao salvar histórico: ${historyError.message}`);
        }

        console.log(`[performClosing] Histórico salvo com sucesso para ${pilot.name}.`);
    }
};