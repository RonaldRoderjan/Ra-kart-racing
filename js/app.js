// js/app.js

const App = {
    
    async init() {
        // 1. Registrar o Service Worker (caminho RELATIVO para dev)
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

        // 4. Iniciar "Cron Job" de fechamento
        setInterval(() => {
            Auth.isAuthenticated().then(isAuth => {
                if (isAuth) {
                    Auth.getUserProfile().then(profile => {
                        if (profile && profile.role === 'admin') {
                            DB.checkAutoClosing();
                        }
                    });
                }
            });
        }, 3600000); 
    },

    /**
     * Direciona o usuário para a view correta com base na sua role.
     */
    async routeUser(role) {
        if (role === 'admin') {
            UI.showView('admin-dashboard-view');
            await UI.renderAdminDashboard();
        } else if (role === 'piloto') {
            UI.showView('pilot-dashboard-view');
            await UI.renderPilotDashboard();
        } else {
            console.error("Role desconhecida:", role);
            await Auth.logout();
        }
    },

    addEventListeners() {
        // --- Autenticação ---
        // CORREÇÃO: Usamos (e) => this.handleLogin(e) para manter o 'this'
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e)); 
        document.getElementById('logout-btn').addEventListener('click', () => Auth.logout()); // Padronizado
        document.getElementById('pilot-logout-btn').addEventListener('click', () => Auth.logout()); 

        // --- Abertura de Modais (Admin) ---
        document.getElementById('add-pilot-btn').addEventListener('click', () => this.handleOpenAddPilotModal()); 
        
        // --- Fechamento de Modais ---
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => UI.closeModal(e.target.dataset.modalId));
        });
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                UI.closeModal(e.target.id);
            }
        });

        // --- Submissão de Formulários (Admin) ---
        document.getElementById('pilot-form').addEventListener('submit', (e) => this.handlePilotSubmit(e)); 
        document.getElementById('expense-form').addEventListener('submit', (e) => this.handleExpenseSubmit(e)); 
        document.getElementById('reimbursement-form').addEventListener('submit', (e) => this.handleReimbursementSubmit(e)); 
    },

    // --- Handlers de Eventos ---

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');
        
        const result = await Auth.login(email, password);
        
        if (result.success) {
            errorEl.textContent = '';
            await this.routeUser(result.role); 
        } else {
            errorEl.textContent = result.message;
        }
    },

    /**
     * NOVO: Handler para ver o Histórico
     */
    async handleViewHistory(pilotId, pilotName, fromView) {
        await UI.renderHistory(pilotId, pilotName, fromView);
    },

    /**
     * Handler para Excluir Piloto (Admin)
     */
    async handleDeletePilot(pilotId, pilotName) {
        if (!confirm(`Tem certeza que deseja excluir ${pilotName}?\n\nATENÇÃO: Isso deleta o piloto, mas por enquanto NÃO deleta a conta de login dele.`)) {
            return;
        }
        
        try {
            await DB.deletePilot(pilotId);
            await UI.renderAdminDashboard(); 
        } catch (err) {
            console.error(err);
            alert("Erro ao excluir piloto.");
        }
    },

    // --- Handlers de Admin ---
    handleOpenAddPilotModal() {
        UI.resetPilotForm();
        UI.openModal('pilot-modal');
    },
    
    async handleOpenEditPilotModal(pilotId) {
        const pilot = await DB.getPilotById(pilotId); 
        if (pilot) {
            await UI.populatePilotForm(pilot); 
            UI.openModal('pilot-modal');
        }
    },

    async handlePilotSubmit(e) {
        e.preventDefault();
        const pilotData = {
            id: document.getElementById('pilot-id').value,
            name: document.getElementById('pilot-name').value,
            category: document.getElementById('pilot-category').value,
            baseFee: document.getElementById('pilot-fee').value,
            closingDate: document.getElementById('pilot-closing-date').value,
            observations: document.getElementById('pilot-obs').value,
        };
        
        try {
            await DB.addOrUpdatePilot(pilotData); 
            UI.closeModal('pilot-modal');
            await UI.renderAdminDashboard(); 
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar piloto.");
        }
    },

    // --- Handlers Financeiros (Admin) ---
    handleOpenExpenseModal(pilotId) {
        document.getElementById('expense-pilot-id').value = pilotId;
        document.getElementById('expense-form').reset();
        UI.openModal('expense-modal');
    },
    async handleExpenseSubmit(e) {
        e.preventDefault();
        const pilotId = document.getElementById('expense-pilot-id').value;
        const desc = document.getElementById('expense-desc').value;
        const amount = document.getElementById('expense-amount').value;

        if(pilotId && desc && amount) {
            try {
                await DB.addExpense(pilotId, desc, amount); 
                UI.closeModal('expense-modal');
                await UI.renderAdminDashboard(); 
            } catch (err) {
                console.error(err);
                alert("Erro ao adicionar gasto.");
            }
        }
    },
    handleOpenReimbursementModal(pilotId) {
        document.getElementById('reimbursement-pilot-id').value = pilotId;
        document.getElementById('reimbursement-form').reset();
        UI.openModal('reimbursement-modal');
    },
    async handleReimbursementSubmit(e) {
        e.preventDefault();
        const pilotId = document.getElementById('reimbursement-pilot-id').value;
        const desc = document.getElementById('reimbursement-desc').value;
        const amount = document.getElementById('reimbursement-amount').value;

        if(pilotId && desc && amount) {
            try {
                await DB.addReimbursement(pilotId, desc, amount); 
                UI.closeModal('reimbursement-modal');
                await UI.renderAdminDashboard(); 
            } catch (err) {
                console.error(err);
                alert("Erro ao adicionar reembolso.");
            }
        }
    }
};

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});