// js/app.js

const App = {
    
    async init() {
        // 1. Registrar o Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => console.log('Service Worker registrado:', registration.scope))
                    .catch(error => console.log('Falha no registro do Service Worker:', error));
            });
        }

        // 2. Verificar autenticação (agora é async)
        await Auth.checkAuth();

        // 3. Adicionar Event Listeners globais
        this.addEventListeners();

        // 4. Iniciar "Cron Job" simulado para fechamento automático
        setInterval(() => {
            // A verificação de auth é síncrona, o DB.checkAutoClosing é async
            Auth.isAuthenticated().then(isAuth => {
                if (isAuth) {
                    DB.checkAutoClosing();
                }
            });
        }, 3600000); // A cada 1 hora
    },

    addEventListeners() {
        // --- Autenticação ---
        document.getElementById('login-form').addEventListener('submit', this.handleLogin);
        document.getElementById('logout-btn').addEventListener('click', Auth.logout);

        // --- Abertura de Modais ---
        document.getElementById('add-pilot-btn').addEventListener('click', this.handleOpenAddPilotModal);
        
        // --- Fechamento de Modais ---
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => UI.closeModal(e.target.dataset.modalId));
        });
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                UI.closeModal(e.target.id);
            }
        });

        // --- Submissão de Formulários ---
        document.getElementById('pilot-form').addEventListener('submit', this.handlePilotSubmit);
        document.getElementById('expense-form').addEventListener('submit', this.handleExpenseSubmit);
        document.getElementById('reimbursement-form').addEventListener('submit', this.handleReimbursementSubmit);
    },

    // --- Handlers de Eventos (AGORA SÃO ASYNC) ---

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');
        
        const result = await Auth.login(email, password);
        
        if (result.success) {
            errorEl.textContent = '';
            UI.showView('app-view');
            await UI.renderDashboard(); // Precisa de 'await'
        } else {
            errorEl.textContent = result.message;
        }
    },

    // --- Handlers de Piloto ---
    handleOpenAddPilotModal() {
        UI.resetPilotForm();
        UI.openModal('pilot-modal');
    },
    
    async handleOpenEditPilotModal(pilotId) {
        const pilot = await DB.getPilotById(pilotId); // 'await'
        if (pilot) {
            UI.populatePilotForm(pilot);
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
            await DB.addOrUpdatePilot(pilotData); // 'await'
            UI.closeModal('pilot-modal');
            await UI.renderDashboard(); // 'await'
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar piloto.");
        }
    },

    // --- Handlers Financeiros (Gasto e Reembolso) ---
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
                await DB.addExpense(pilotId, desc, amount); // 'await'
                UI.closeModal('expense-modal');
                await UI.updatePilotCard(pilotId); // 'await' (que vai re-renderizar o dashboard)
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
                await DB.addReimbursement(pilotId, desc, amount); // 'await'
                UI.closeModal('reimbursement-modal');
                await UI.updatePilotCard(pilotId); // 'await'
            } catch (err) {
                console.error(err);
                alert("Erro ao adicionar reembolso.");
            }
        }
    }
};

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});