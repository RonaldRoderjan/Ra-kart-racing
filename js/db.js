// js/db.js (v12-local - com createPilotAndUser e updatePilot)
const DB = {
    async getPilots() {
        const today=new Date(); const firstDay=new Date(today.getFullYear(), today.getMonth(), 1).toISOString(); const lastDay=new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
        const { data: pilots, error } = await supabase.from('pilots').select(`*,expenses(*),reimbursements(*)`).gte('expenses.created_at', firstDay).lte('expenses.created_at', lastDay).gte('reimbursements.created_at', firstDay).lte('reimbursements.created_at', lastDay).order('name'); 
        if (error) { console.error('Erro getPilots:', error.message); return []; } return pilots;
    },
    async getPilotById(id) { const { data, error } = await supabase.from('pilots').select('*').eq('id', id).single(); if (error) { console.error('Erro getPilotById:', error.message); return null; } return data; },
    async updatePilot(pilotData) {
        if (!pilotData.id) { throw new Error("ID necessário."); }
        const dataToSave = { name: pilotData.name, category: pilotData.category || null, baseFee: parseFloat(pilotData.baseFee), closingDate: parseInt(pilotData.closingDate), observations: pilotData.observations || null };
        const { error } = await supabase.from('pilots').update(dataToSave).eq('id', pilotData.id);
        if (error) { console.error('Erro updatePilot:', error.message); throw new Error(error.message); } 
        // console.log(`[DB] Piloto ${pilotData.id} atualizado.`); // Log opcional
    },
    async createPilotAndUser(pilotData, userData) {
        // console.log(`[DB] Chamando create-pilot-with-user...`); // Log opcional
        const { data, error } = await supabase.functions.invoke('create-pilot-with-user',{ body: { pilotData: { name: pilotData.name, category: pilotData.category||null, baseFee: parseFloat(pilotData.baseFee), closingDate: parseInt(pilotData.closingDate), observations: pilotData.observations||null }, userData: { email: userData.email, password: userData.password||undefined } } });
        if (error) { console.error('[DB] Erro invoke create:', error.message); let msg=error.message; if(error.context?.json){try{const json=await error.context.json();if(json?.error) msg=json.error;}catch{}} throw new Error(msg); }
        if (data?.error) { console.error('[DB] Erro func create:', data.error); throw new Error(data.error); } 
        // console.log('[DB] Resposta create:', data); // Log opcional
        return data.message || "Sucesso."; 
    },
    async deletePilot(pilotId) {
        // console.log(`[DB] Chamando delete-pilot-full para ${pilotId}...`); // Log opcional
        const { data, error } = await supabase.functions.invoke('delete-pilot-full', { body: { pilot_id: pilotId } });
        if (error) { console.error('[DB] Erro invoke delete:', error.message); let msg=error.message; if(error.context?.json){try{const json=await error.context.json();if(json?.error) msg=json.error;}catch{}} throw new Error(msg); }
        if (data?.error) { console.error('[DB] Erro func delete:', data.error); throw new Error(data.error); } 
        // console.log('[DB] Resposta delete:', data); // Log opcional
    },
    calculateTotals(pilot) {
        const exp=pilot.expenses||[]; const reimb=pilot.reimbursements||[]; const totalExp=exp.reduce((s,i)=>s+parseFloat(i.amount||0),0); const totalReimb=reimb.reduce((s,i)=>s+parseFloat(i.amount||0),0); const total=parseFloat(pilot.baseFee||0)+totalExp-totalReimb; 
        return { totalExpenses:totalExp, totalReimbursements:totalReimb, totalMonth:total };
    },
    async addExpense(pilotId, description, amount) { const { error } = await supabase.from('expenses').insert({ pilot_id: pilotId, description: description, amount: parseFloat(amount) }); if (error) { console.error('Erro addExpense:', error.message); throw new Error(error.message); } },
    async addReimbursement(pilotId, description, amount) { const { error } = await supabase.from('reimbursements').insert({ pilot_id: pilotId, description: description, amount: parseFloat(amount) }); if (error) { console.error('Erro addReimbursement:', error.message); throw new Error(error.message); } },
    async getHistory(pilotId) { const { data, error } = await supabase.from('closing_history').select('*').eq('pilot_id', pilotId).order('month_reference', { ascending: false }); if (error) { console.error('Erro getHistory:', error.message); throw new Error(`Falha histórico: ${error.message}`); } return data || []; },
    getPdfUrl(pdfPath) { const { data } = supabase.storage.from('fechamentos').getPublicUrl(pdfPath); if (!data?.publicUrl) { console.error('Erro getPdfUrl:', pdfPath); return null; } return data.publicUrl; },
    async checkAutoClosing() { /* ... código idêntico ... */ },
    async performClosing(pilotId) { /* ... código idêntico ... */ }
};