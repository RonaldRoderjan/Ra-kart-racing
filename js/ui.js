// js/ui.js

const UI = {
    // --- Gerenciamento de Telas (Views) ---
    showView(viewId) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(viewId)?.classList.add('active');
    },

    // --- Gerenciamento de Modais ---
    openModal(modalId) {
        document.getElementById(modalId)?.classList.add('active');
    },

    closeModal(modalId) {
        document.getElementById(modalId)?.classList.remove('active');
    },

    // --- Renderização do Dashboard (ADMIN) ---
    async renderAdminDashboard() {
        const grid = document.getElementById('admin-dashboard-grid'); 
        const loading = document.getElementById('dashboard-loading');
        if (!grid || !loading) return;
        
        grid.innerHTML = ''; 
        loading.classList.remove('hidden');
        
        // RLS garante que o Admin vê TODOS os pilotos
        const pilots = await DB.getPilots(); 
        
        loading.classList.add('hidden');

        if (pilots.length === 0) {
            grid.innerHTML = '<p>Nenhum piloto cadastrado. Clique em "+ Novo Piloto" para começar.</p>';
            return;
        }

        pilots.forEach(pilot => {
            const card = this.createAdminPilotCard(pilot); // Card de Admin
            grid.appendChild(card);
        });

        this.addAdminCardEventListeners(); // Listeners de Admin
    },

    // --- Renderização do Dashboard (PILOTO) ---
    async renderPilotDashboard() {
        const content = document.getElementById('pilot-content');
        const loading = document.getElementById('pilot-loading');
        if (!content || !loading) return;

        content.innerHTML = '';
        loading.classList.remove('hidden');
        
        // RLS garante que o Piloto vê APENAS O SEU piloto
        const pilots = await DB.getPilots(); 
        
        loading.classList.add('hidden');

        if (pilots.length === 0) {
            content.innerHTML = '<p>Erro: Nenhum piloto associado a esta conta. Contate o administrador.</p>';
            return;
        }

        const myPilot = pilots[0]; // Pega o único piloto do array
        const totals = DB.calculateTotals(myPilot);

        // Renderiza a view do piloto
        content.innerHTML = `
            <h2>Olá, ${myPilot.name}!</h2>
            <p>Aqui está seu resumo financeiro para este mês.</p>
            
            <div class="pilot-card" style="margin-top: 1rem;">
                <div class="card-header">
                    <h3>Resumo do Mês</h3>
                    <span class="pilot-category">${myPilot.category}</span>
                </div>
                <div class="card-body">
                    <div class="data-point">
                        Mensalidade
                        <span>R$ ${parseFloat(myPilot.baseFee).toFixed(2)}</span>
                    </div>
                    <div class="data-point expenses">
                        Gastos Extras
                        <span>R$ ${totals.totalExpenses.toFixed(2)}</span>
                    </div>
                    <div class="data-point reimbursements">
                        Reembolsos
                        <span>R$ ${totals.totalReimbursements.toFixed(2)}</span>
                    </div>
                    <div class="data-point total">
                        Total do Mês
                        <span>R$ ${totals.totalMonth.toFixed(2)}</span>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary" id="view-statement-btn">Ver Extrato Detalhado</button>
                    <button class="btn btn-secondary" id="view-history-btn">Ver Histórico</button>
                </div>
            </div>

            <div class="payment-area" style="margin-top: 2rem; padding: 1rem; background-color: var(--color-surface); border-radius: var(--border-radius);">
                <h3>Pagamento via PIX</h3>
                <p>Valor Total: <strong>R$ ${totals.totalMonth.toFixed(2)}</strong></p>
                <p style="margin-top: 10px;">Chave PIX (CNPJ):</p>
                <p><strong>12.345.678/0001-99</strong></p>
                </div>
        `;
        
        // (Adicionaremos listeners para 'view-statement-btn' etc. depois)
    },


    /**
     * Cria o Card para a view de Admin (com botão de Excluir)
     */
    createAdminPilotCard(pilot) {
        const totals = DB.calculateTotals(pilot);

        const card = document.createElement('div');
        card.className = 'pilot-card';
        card.setAttribute('data-pilot-id', pilot.id);
        
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3>${pilot.name}</h3>
                    <span class="pilot-category">${pilot.category}</span>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-secondary btn-small edit-pilot-btn" data-pilot-id="${pilot.id}">Editar</button>
                    <button class="btn btn-danger btn-small delete-pilot-btn" data-pilot-id="${pilot.id}" data-pilot-name="${pilot.name}">Excluir</button>
                </div>
            </div>
            <div class="card-body">
                <div class="data-point">
                    Mensalidade
                    <span>R$ ${parseFloat(pilot.baseFee).toFixed(2)}</span>
                </div>
                <div class="data-point expenses">
                    Gastos Extras
                    <span>R$ ${totals.totalExpenses.toFixed(2)}</span>
                </div>
                <div class="data-point reimbursements">
                    Reembolsos
                    <span>R$ ${totals.totalReimbursements.toFixed(2)}</span>
                </div>
                <div class="data-point total">
                    Total do Mês
                    <span>R$ ${totals.totalMonth.toFixed(2)}</span>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-primary add-expense-btn" data-pilot-id="${pilot.id}">+ Gasto</button>
                <button class="btn btn-secondary add-reimbursement-btn" data-pilot-id="${pilot.id}">Reembolso</button>
            </div>
        `;
        return card;
    },

    /**
     * Adiciona Listeners para os botões do card de Admin
     */
    addAdminCardEventListeners(scope = document) {
        scope.querySelectorAll('.add-expense-btn').forEach(btn => {
            btn.addEventListener('click', (e) => App.handleOpenExpenseModal(e.target.dataset.pilotId));
        });

        scope.querySelectorAll('.add-reimbursement-btn').forEach(btn => {
            btn.addEventListener('click', (e) => App.handleOpenReimbursementModal(e.target.dataset.pilotId));
        });
        
        scope.querySelectorAll('.edit-pilot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => App.handleOpenEditPilotModal(e.target.dataset.pilotId));
        });

        // NOVO Listener para Excluir
        scope.querySelectorAll('.delete-pilot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => App.handleDeletePilot(e.target.dataset.pilotId, e.target.dataset.pilotName));
        });
    },
    
    // --- Preenchimento de Formulários (Admin) ---
    async populatePilotForm(pilot) {
        document.getElementById('pilot-modal-title').textContent = 'Editar Piloto';
        document.getElementById('pilot-id').value = pilot.id; 
        document.getElementById('pilot-name').value = pilot.name;
        document.getElementById('pilot-category').value = pilot.category;
        document.getElementById('pilot-fee').value = pilot.baseFee;
        document.getElementById('pilot-closing-date').value = pilot.closingDate;
        document.getElementById('pilot-obs').value = pilot.observations;
    },
    
    resetPilotForm() {
        document.getElementById('pilot-modal-title').textContent = 'Novo Piloto';
        document.getElementById('pilot-form').reset();
        document.getElementById('pilot-id').value = ''; 
    }
};