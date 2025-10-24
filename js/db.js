// js/db.js

const DB = {

    /**
     * Busca pilotos.
     * RLS (Segurança) no Supabase filtra automaticamente:
     * - Se Admin: Retorna TODOS os pilotos.
     * - Se Piloto: Retorna APENAS o piloto associado.
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
     * Adiciona ou atualiza um piloto (Função de Admin).
     */
    async addOrUpdatePilot(pilotData) {
        const dataToSave = {
            name: pilotData.name,
            category: pilotData.category,
            baseFee: parseFloat(pilotData.baseFee),
            closingDate: parseInt(pilotData.closingDate),
            observations: pilotData.observations
        };

        let error;

        if (pilotData.id) {
            // ATUALIZAR (UPDATE)
            ({ error } = await supabase
                .from('pilots')
                .update(dataToSave)
                .eq('id', pilotData.id));
        } else {
            // INSERIR (INSERT)
            ({ error } = await supabase
                .from('pilots')
                .insert(dataToSave));
        }

        if (error) {
            console.error('Erro ao salvar piloto:', error.message);
            throw new Error(error.message); 
        }
    },

    /**
     * Deleta um piloto (Função de Admin).
     */
    async deletePilot(pilotId) {
        const { error } = await supabase
            .from('pilots')
            .delete()
            .eq('id', pilotId);
        
        if (error) {
            console.error('Erro ao deletar piloto:', error.message);
            throw new Error(error.message);
        }
    },

    /**
     * Calcula os totais
     */
    calculateTotals(pilot) {
        const totalExpenses = pilot.expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const totalReimbursements = pilot.reimbursements.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const totalMonth = parseFloat(pilot.baseFee) + totalExpenses - totalReimbursements;

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
        const { error } = await supabase
            .from('expenses')
            .insert({
                pilot_id: pilotId,
                description: description,
                amount: parseFloat(amount)
            });

        if (error) {
            console.error('Erro ao adicionar gasto:', error.message);
            throw new Error(error.message);
        }
    },

    /**
     * Adiciona um novo reembolso.
     */
    async addReimbursement(pilotId, description, amount) {
        const { error } = await supabase
            .from('reimbursements')
            .insert({
                pilot_id: pilotId,
                description: description,
                amount: parseFloat(amount)
            });

        if (error) {
            console.error('Erro ao adicionar reembolso:', error.message);
            throw new Error(error.message);
        }
    },

    // --- LÓGICA DE FECHAMENTO (Função de Admin) ---

    async checkAutoClosing() {
        console.log("Verificando fechamentos automáticos...");
        const today = new Date().getDate(); 
        const currentMonthRef = new Date().toISOString().slice(0, 7); 

        const { data: pilots, error: pilotsError } = await supabase
            .from('pilots')
            .select('id, name, closingDate');

        if (pilotsError) return;

        const { data: history, error: historyError } = await supabase
            .from('closing_history')
            .select('pilot_id')
            .eq('month_reference', currentMonthRef);
        
        if (historyError) return;

        const closedPilots = new Set(history.map(h => h.pilot_id));
        let wasClosed = false;

        for (const pilot of pilots) {
            const alreadyClosed = closedPilots.has(pilot.id);

            if (pilot.closingDate === today && !alreadyClosed) {
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

        if (error) throw new Error(`Erro ao buscar dados do piloto para fechar: ${error.message}`);

        const totals = this.calculateTotals(pilot);

        // Gera o PDF como um Blob
        const pdfBlob = await PDF.generateReport(pilot, totals); 

        // Faz Upload do PDF para o Supabase Storage
        const filePath = `${pilot.id}/${currentMonthRef}_${pilot.name.replace(/ /g, '_')}.pdf`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('fechamentos') // Nome do seu bucket
            .upload(filePath, pdfBlob, {
                contentType: 'application/pdf',
                upsert: true 
            });

        if (uploadError) throw new Error(`Erro ao fazer upload do PDF: ${uploadError.message}`);

        // Registra o fechamento na tabela 'closing_history'
        const { error: historyError } = await supabase
            .from('closing_history')
            .insert({
                pilot_id: pilot.id,
                month_reference: currentMonthRef,
                total_amount: totals.totalMonth,
                pdf_path: uploadData.path 
            });
        
        if (historyError) throw new Error(`Erro ao salvar histórico: ${historyError.message}`);

        console.log(`Histórico salvo: ${uploadData.path}`);
    }
};