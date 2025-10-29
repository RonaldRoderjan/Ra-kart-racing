// js/app.js (v12-local)

// console.log('[DEBUG][app.js] Script app.js carregado...'); // Log Opcional

const App = {
    
    async init() {
        // console.log('[DEBUG][App.init] Iniciando...'); // Log Opcional
        // 1. Service Worker
        if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('service-worker.js', { scope: '.' }).then(reg => console.log('SW (dev) registrado:', reg.scope)).catch(err => console.log('Falha SW:', err)); }); }
        // 2. Auth Check
        await Auth.checkAuth();
        // 3. Listeners
        this.addEventListeners();
        // 4. Cron Job
        setInterval(() => { Auth.isAuthenticated().then(isAuth => { if (isAuth) { Auth.getUserProfile().then(p => { if (p && p.role === 'admin') DB.checkAutoClosing(); }); } }); }, 3600000); 
        // console.log('[DEBUG][App.init] Finalizado.'); // Log Opcional
    },

    async routeUser(role) {
        if (role === 'admin') { UI.showView('admin-dashboard-view'); await UI.renderAdminDashboard(); } 
        else if (role === 'piloto') { UI.showView('pilot-dashboard-view'); await UI.renderPilotDashboard(); } 
        else { console.error("Role inválida:", role); await Auth.logout(); }
    },

    addEventListeners() {
        // console.log('[DEBUG][addEventListeners] Adicionando...'); // Log Opcional
        // Auth
        document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e)); 
        document.getElementById('logout-btn')?.addEventListener('click', () => Auth.logout()); 
        document.getElementById('pilot-logout-btn')?.addEventListener('click', () => Auth.logout()); 
        // Admin Modals
        document.getElementById('add-pilot-btn')?.addEventListener('click', () => this.handleOpenAddPilotModal()); 
        // Global Modals
        document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', (e) => UI.closeModal(e.target.dataset.modalId)));
        window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) UI.closeModal(e.target.id); });
        // Admin Forms
        document.getElementById('pilot-form')?.addEventListener('submit', (e) => this.handlePilotSubmit(e)); 
        document.getElementById('expense-form')?.addEventListener('submit', (e) => this.handleExpenseSubmit(e)); 
        document.getElementById('reimbursement-form')?.addEventListener('submit', (e) => this.handleReimbursementSubmit(e)); 
        // console.log('[DEBUG][addEventListeners] Finalizado.'); // Log Opcional
    },

    // --- Handlers ---
    async handleLogin(e) {
        e.preventDefault(); 
        // console.log('[DEBUG] handleLogin...'); // Log Opcional
        const email = document.getElementById('email')?.value; const password = document.getElementById('password')?.value; const errorEl = document.getElementById('login-error');
        if (!email || !password || !errorEl) { console.error("Campos login não encontrados"); return; }
        errorEl.textContent = ''; 
        try { const result = await Auth.login(email, password); if (result.success) await this.routeUser(result.role); else errorEl.textContent = result.message; } 
        catch (err) { console.error('Erro handleLogin:', err); errorEl.textContent = "Erro inesperado."; }
    },
    async handleViewHistory(pilotId, pilotName, fromView) {
        // console.log(`[DEBUG] handleViewHistory: ${pilotName}`); // Log Opcional
        try { await UI.renderHistory(pilotId, pilotName, fromView); } 
        catch (error) { console.error('Erro handleViewHistory:', error); alert(`Erro histórico: ${error.message}`); }
    },
    async handleDeletePilot(pilotId, pilotName) {
        // console.log(`[DEBUG] handleDeletePilot: ${pilotName}`); // Log Opcional
        if (!confirm(`Excluir ${pilotName} e sua conta?\n\nPERMANENTEMENTE?`)) { return; }
        try { await DB.deletePilot(pilotId); await UI.renderAdminDashboard(); } 
        catch (err) { console.error('Erro handleDeletePilot:', err); alert(`Erro excluir: ${err.message}`); }
    },
    // Admin Handlers
    handleOpenAddPilotModal() { UI.resetPilotForm(); document.getElementById('pilot-login-fields').style.display='block'; document.getElementById('pilot-email').required=true; UI.openModal('pilot-modal'); },
    async handleOpenEditPilotModal(pilotId) { const pilot = await DB.getPilotById(pilotId); if (pilot) { await UI.populatePilotForm(pilot); document.getElementById('pilot-login-fields').style.display='none'; document.getElementById('pilot-email').required=false; UI.openModal('pilot-modal'); } else { alert('Piloto não encontrado.'); } },
    async handlePilotSubmit(e) {
        e.preventDefault(); 
        const pilotId = document.getElementById('pilot-id').value; const isEditing = !!pilotId;
        const pilotData = { id: pilotId||undefined, name: document.getElementById('pilot-name').value, category: document.getElementById('pilot-category').value||null, baseFee: document.getElementById('pilot-fee').value, closingDate: document.getElementById('pilot-closing-date').value, observations: document.getElementById('pilot-obs').value||null };
        try { let msg = ''; if (isEditing) { await DB.updatePilot(pilotData); msg = 'Piloto atualizado!'; } else { const userData = { email: document.getElementById('pilot-email').value, password: document.getElementById('pilot-password').value||undefined }; if (!userData.email) { alert('Email login obrigatório.'); return; } msg = await DB.createPilotAndUser(pilotData, userData); } UI.closeModal('pilot-modal'); await UI.renderAdminDashboard(); alert(msg); } 
        catch (err) { console.error('Erro handlePilotSubmit:', err); alert(`Erro salvar: ${err.message}`); }
    },
    // Admin Finance Handlers
    handleOpenExpenseModal(pilotId) { document.getElementById('expense-pilot-id').value = pilotId; document.getElementById('expense-form').reset(); UI.openModal('expense-modal'); },
    async handleExpenseSubmit(e) {
        e.preventDefault(); const pilotId = document.getElementById('expense-pilot-id').value; const desc = document.getElementById('expense-desc').value; const amount = document.getElementById('expense-amount').value;
        if(pilotId && desc && amount) { try { await DB.addExpense(pilotId, desc, amount); UI.closeModal('expense-modal'); await UI.renderAdminDashboard(); } catch (err) { alert(`Erro gasto: ${err.message}`); } } else { alert('Preencha.'); }
    },
    handleOpenReimbursementModal(pilotId) { document.getElementById('reimbursement-pilot-id').value = pilotId; document.getElementById('reimbursement-form').reset(); UI.openModal('reimbursement-modal'); },
    async handleReimbursementSubmit(e) {
        e.preventDefault(); const pilotId = document.getElementById('reimbursement-pilot-id').value; const desc = document.getElementById('reimbursement-desc').value; const amount = document.getElementById('reimbursement-amount').value;
        if(pilotId && desc && amount) { try { await DB.addReimbursement(pilotId, desc, amount); UI.closeModal('reimbursement-modal'); await UI.renderAdminDashboard(); } catch (err) { alert(`Erro reembolso: ${err.message}`); } } else { alert('Preencha.'); }
    }
};

document.addEventListener('DOMContentLoaded', () => { App.init(); });