// js/app.js (v12-local-debug-listener2)

// LOG INICIAL PARA VER SE O ARQUIVO CARREGA
console.log('[DEBUG][app.js] Script app.js carregado e iniciando...'); 

const App = {
    
    async init() {
        console.log('[DEBUG][App.init] Iniciando...'); // Log no início do init
        // 1. Registrar o Service Worker (dev)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js', { scope: '.' }) 
                    .then(registration => console.log('Service Worker (dev) registrado:', registration.scope)) 
                    .catch(error => console.log('Falha no registro do Service Worker:', error));
            });
        }
        // 2. Verificar autenticação
        await Auth.checkAuth();
        // 3. Adicionar Event Listeners globais
        this.addEventListeners();
        // 4. Iniciar "Cron Job" de fechamento (só admin)
        setInterval(() => { 
            Auth.isAuthenticated().then(isAuth => {
                if (isAuth) { Auth.getUserProfile().then(profile => { if (profile && profile.role === 'admin') { DB.checkAutoClosing(); } }); }
            });
        }, 3600000); 
        console.log('[DEBUG][App.init] Finalizado.'); // Log no fim do init
    },

    /**
     * Direciona o usuário para a view correta.
     */
    async routeUser(role) {
        // console.log('[DEBUG] App.routeUser recebendo role:', role); 
        if (role === 'admin') { 
            // console.log('[DEBUG] Roteando para Admin Dashboard...'); 
            UI.showView('admin-dashboard-view'); await UI.renderAdminDashboard(); 
        } else if (role === 'piloto') { 
            // console.log('[DEBUG] Roteando para Piloto Dashboard...'); 
            UI.showView('pilot-dashboard-view'); await UI.renderPilotDashboard(); 
        } else { 
            console.error("[DEBUG] Role desconhecida:", role); await Auth.logout(); 
        }
    },

    addEventListeners() {
        console.log('[DEBUG][addEventListeners] Adicionando listeners...'); // Log no início
        // --- Autenticação ---
        // REVERTIDO PARA addEventListener
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => { 
                console.log('[DEBUG][Listener Submit] Formulário submetido! Chamando handleLogin...'); // LOG EXTRA
                this.handleLogin(e);
            });
            console.log('[DEBUG] Listener de SUBMIT para login-form adicionado.');
        } else {
             console.error('[DEBUG] ERRO FATAL: Formulário #login-form não encontrado!');
        }
        
        // Mantém addEventListener para os outros
        // Adiciona verificação de existência para evitar erros se logado como piloto
        document.getElementById('logout-btn')?.addEventListener('click', () => Auth.logout()); 
        document.getElementById('pilot-logout-btn')?.addEventListener('click', () => Auth.logout()); 

        const addPilotBtn = document.getElementById('add-pilot-btn');
        // Não loga erro se não encontrar, pois é normal na tela de piloto
        if (addPilotBtn) { addPilotBtn.addEventListener('click', () => this.handleOpenAddPilotModal()); } 
        
        // --- Fechamento de Modais ---
        document.querySelectorAll('.close-modal').forEach(btn => { btn.addEventListener('click', (e) => UI.closeModal(e.target.dataset.modalId)); });
        window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) { UI.closeModal(e.target.id); } });

        // --- Submissão de Formulários (Admin) ---
        const pilotForm = document.getElementById('pilot-form');
        const expenseForm = document.getElementById('expense-form');
        const reimbursementForm = document.getElementById('reimbursement-form');
        // REVERTIDO PARA addEventListener
        if(pilotForm) pilotForm.addEventListener('submit', (e) => this.handlePilotSubmit(e)); 
        if(expenseForm) expenseForm.addEventListener('submit', (e) => this.handleExpenseSubmit(e)); 
        if(reimbursementForm) reimbursementForm.addEventListener('submit', (e) => this.handleReimbursementSubmit(e)); 
        console.log('[DEBUG][addEventListeners] Listeners finalizados.'); // Log no fim
    },

    // --- Handlers de Eventos ---

    async handleLogin(e) {
         // LOG 0: Verifica se o evento 'e' foi recebido
        console.log('[DEBUG][handleLogin] Evento recebido:', e); 
        
        // Garante que preventDefault foi chamado ANTES de qualquer outra coisa
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
            console.log('[DEBUG][handleLogin] e.preventDefault() chamado.'); // LOG 0.1
        } else {
             console.error('[DEBUG][handleLogin] ERRO: Evento "e" inválido ou sem preventDefault!');
             try { e.returnValue = false; } catch {} 
             return; 
        }
        
        console.log('[DEBUG][handleLogin] Iniciado após preventDefault.'); // LOG 1

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const errorEl = document.getElementById('login-error');

        // Verifica se os inputs foram encontrados
        if (!emailInput || !passwordInput || !errorEl) {
             console.error('[DEBUG][handleLogin] ERRO FATAL: Elemento #email, #password ou #login-error não encontrado no DOM!');
             alert("Erro interno: Falha ao encontrar campos de login."); 
             return; 
        }
        console.log('[DEBUG][handleLogin] Inputs e errorEl encontrados.'); // LOG 1.1

        // Coleta valores
        const emailValue = emailInput.value;
        const passwordValue = passwordInput.value;
        console.log('[DEBUG][handleLogin] Valor pego do input #email:', emailValue, typeof emailValue); // LOG 2
        console.log('[DEBUG][handleLogin] Valor pego do input #password:', passwordValue ? '******' : '(vazio)', typeof passwordValue); // LOG 3
        
         // Validação robusta dos valores
         if (typeof emailValue !== 'string' || typeof passwordValue !== 'string' || !emailValue || !passwordValue) {
             console.error('[DEBUG][handleLogin] ERRO: Valores de email/senha inválidos ou vazios.', `Email type: ${typeof emailValue}, value: "${emailValue}"`, `Password type: ${typeof passwordValue}, value: "${passwordValue ? '***' : ''}"`);
             errorEl.textContent = "Por favor, preencha email e senha corretamente.";
             return;
         }
         console.log('[DEBUG][handleLogin] Valores de email/senha parecem válidos.'); // LOG 3.1

        // Limpa erro antigo
        errorEl.textContent = ''; 
        console.log('[DEBUG][handleLogin] Chamando Auth.login...'); // LOG 4

        try {
            // *** A CHAMADA REAL PARA Auth.login ***
            const result = await Auth.login(emailValue, passwordValue); 
            console.log('[DEBUG][handleLogin] Auth.login RETORNOU:', result); // Log DEPOIS da chamada
            
            if (result.success) { 
                console.log('[DEBUG][handleLogin] Sucesso. Chamando routeUser...'); 
                await this.routeUser(result.role); 
            } else { 
                console.log('[DEBUG][handleLogin] Falha:', result.message); 
                errorEl.textContent = result.message; 
            }
        } catch (loginError) {
             console.error('[DEBUG][handleLogin] Erro PEGO NO CATCH ao chamar Auth.login:', loginError);
             errorEl.textContent = "Erro inesperado durante login.";
        }
         console.log('[DEBUG][handleLogin] Finalizado.'); // LOG 5
    },


    async handleViewHistory(pilotId, pilotName, fromView) {
        console.log(`[DEBUG] handleViewHistory INICIADO para ${pilotName} (${pilotId}), vindo de ${fromView}`); 
        try { await UI.renderHistory(pilotId, pilotName, fromView); console.log(`[DEBUG] handleViewHistory FINALIZADO.`); } 
        catch (error) { console.error(`[DEBUG] Erro em handleViewHistory:`, error); alert(`Erro ao carregar histórico: ${error.message}`); }
    },

    async handleDeletePilot(pilotId, pilotName) {
        console.log(`[DEBUG] handleDeletePilot chamado para ${pilotName} (${pilotId})`);
        if (!confirm(`Tem certeza que deseja excluir ${pilotName}?\n\nATENÇÃO: Isso excluirá PERMANENTEMENTE o piloto, seus dados financeiros E sua conta de login.`)) { console.log('[DEBUG] Exclusão cancelada.'); return; }
        try { console.log('[DEBUG] Chamando DB.deletePilot (Edge Function)...'); await DB.deletePilot(pilotId); console.log('[DEBUG] DB.deletePilot concluído. Renderizando dashboard...'); await UI.renderAdminDashboard(); } 
        catch (err) { console.error('[DEBUG] Erro em handleDeletePilot:', err); alert(`Erro ao excluir piloto: ${err.message}`); }
    },

    // --- Handlers de Admin ---
    handleOpenAddPilotModal() {
        console.log('[DEBUG] handleOpenAddPilotModal chamado.');
        UI.resetPilotForm(); 
        document.getElementById('pilot-login-fields').style.display = 'block'; 
        document.getElementById('pilot-email').required = true; 
        UI.openModal('pilot-modal');
    },
    
    async handleOpenEditPilotModal(pilotId) {
        console.log(`[DEBUG] handleOpenEditPilotModal chamado para ${pilotId}`);
        const pilot = await DB.getPilotById(pilotId); 
        if (pilot) {
            await UI.populatePilotForm(pilot); 
            document.getElementById('pilot-login-fields').style.display = 'none'; 
            document.getElementById('pilot-email').required = false; 
            UI.openModal('pilot-modal');
        } else { console.warn('[DEBUG] Piloto não encontrado para edição:', pilotId); alert('Piloto não encontrado.'); }
    },

    async handlePilotSubmit(e) {
        e.preventDefault(); console.log('[DEBUG] handlePilotSubmit chamado.');
        const pilotId = document.getElementById('pilot-id').value; 
        const isEditing = !!pilotId;

        const pilotData = {
            id: pilotId || undefined, name: document.getElementById('pilot-name').value,
            category: document.getElementById('pilot-category').value || null, baseFee: document.getElementById('pilot-fee').value,
            closingDate: document.getElementById('pilot-closing-date').value, observations: document.getElementById('pilot-obs').value || null,
        };

        try {
            if (isEditing) {
                 console.log('[DEBUG] handlePilotSubmit: Modo Edição.'); await DB.updatePilot(pilotData); alert('Piloto atualizado com sucesso!');
            } else {
                console.log('[DEBUG] handlePilotSubmit: Modo Criação.');
                 const userData = { email: document.getElementById('pilot-email').value, password: document.getElementById('pilot-password').value || undefined };
                 if (!userData.email) { alert('O email de login é obrigatório.'); return; }
                 const successMessage = await DB.createPilotAndUser(pilotData, userData); alert(successMessage); 
            }
            UI.closeModal('pilot-modal'); await UI.renderAdminDashboard(); 
        } catch (err) { console.error('[DEBUG] Erro em handlePilotSubmit:', err); alert(`Erro ao salvar piloto: ${err.message}`); }
    },

    // --- Handlers Financeiros (Admin) ---
    handleOpenExpenseModal(pilotId) { console.log(`[DEBUG] handleOpenExpenseModal: ${pilotId}`); document.getElementById('expense-pilot-id').value = pilotId; document.getElementById('expense-form').reset(); UI.openModal('expense-modal'); },
    async handleExpenseSubmit(e) {
        e.preventDefault(); console.log('[DEBUG] handleExpenseSubmit.'); const pilotId = document.getElementById('expense-pilot-id').value; const desc = document.getElementById('expense-desc').value; const amount = document.getElementById('expense-amount').value;
        if(pilotId && desc && amount) { try { await DB.addExpense(pilotId, desc, amount); UI.closeModal('expense-modal'); await UI.renderAdminDashboard(); } catch (err) { console.error('Erro:', err); alert(`Erro: ${err.message}`); } } 
        else { alert('Preencha todos os campos.'); }
    },
    handleOpenReimbursementModal(pilotId) { console.log(`[DEBUG] handleOpenReimbursementModal: ${pilotId}`); document.getElementById('reimbursement-pilot-id').value = pilotId; document.getElementById('reimbursement-form').reset(); UI.openModal('reimbursement-modal'); },
    async handleReimbursementSubmit(e) {
        e.preventDefault(); console.log('[DEBUG] handleReimbursementSubmit.'); const pilotId = document.getElementById('reimbursement-pilot-id').value; const desc = document.getElementById('reimbursement-desc').value; const amount = document.getElementById('reimbursement-amount').value;
        if(pilotId && desc && amount) { try { await DB.addReimbursement(pilotId, desc, amount); UI.closeModal('reimbursement-modal'); await UI.renderAdminDashboard(); } catch (err) { console.error('Erro:', err); alert(`Erro: ${err.message}`); } } 
        else { alert('Preencha todos os campos.'); }
    }
};

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', () => {
    // Log antes de iniciar o App
    console.log('[DEBUG][DOMContentLoaded] DOM carregado. Iniciando App.init()...'); 
    App.init();
});