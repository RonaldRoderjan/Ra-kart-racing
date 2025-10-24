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
        
        const pilots = await DB.getPilots(); 
        
        loading.classList.add('hidden');

        if (pilots.length === 0) {
            grid.innerHTML = '<p>Nenhum piloto cadastrado. Clique em "+ Novo Piloto" para começar.</p>';
            return;
        }

        pilots.forEach(pilot => {
            const card = this.createAdminPilotCard(pilot); 
            grid.appendChild(card);
        });

        this.addAdminCardEventListeners(); 
    },

    // --- Renderização do Dashboard (PILOTO) ---
    async renderPilotDashboard() {
        const content = document.getElementById('pilot-content');
        const loading = document.getElementById('pilot-loading');
        if (!content || !loading) return;

        content.innerHTML = '';
        loading.classList.remove('hidden');
        
        const pilots = await DB.getPilots(); 
        
        loading.classList.add('hidden');

        if (pilots.length === 0) {
            content.innerHTML = '<p>Erro: Nenhum piloto associado a esta conta. Contate o administrador.</p>';
            return;
        }

        const myPilot = pilots[0]; 
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
                    <button class="btn btn-primary" id="view-statement-btn" data-pilot-id="${myPilot.id}">Ver Extrato Detalhado</button>
                    <button class="btn btn-secondary" id="view-history-btn" data-pilot-id="${myPilot.id}" data-pilot-name="${myPilot.name}">Ver Histórico</button>
                </div>
            </div>

            <div class="payment-area" style="margin-top: 2rem; padding: 1rem; background-color: var(--color-surface); border-radius: var(--border-radius);">
                <h3>Pagamento via PIX</h3>
                <p>Valor Total: <strong>R$ ${totals.totalMonth.toFixed(2)}</strong></p>
                <p style="margin-top: 10px;">Chave PIX (CNPJ):</p>
                <p><strong>12.345.678/0001-99</strong></p>
            </div>
        `;
        
        // ADICIONA O LISTENER PARA O BOTÃO DE HISTÓRICO
        // (Usamos .onclick para garantir que o listener é re-adicionado)
        document.getElementById('view-history-btn').onclick = (e) => {
            const pilotId = e.target.dataset.pilotId;
            const pilotName = e.target.dataset.pilotName;
            App.handleViewHistory(pilotId, pilotName, 'pilot-dashboard-view'); // Passa de onde viemos
        };
    },
    
    /**
     * NOVO: Renderiza a tela de Histórico
     */
    async renderHistory(pilotId, pilotName, fromView) {
        const list = document.getElementById('history-list');
        const loading = document.getElementById('history-loading');
        const title = document.getElementById('history-pilot-name');
        const header = document.querySelector('#history-view .app-header .header-actions');
        if (!list || !loading || !title || !header) return;

        list.innerHTML = '';
        loading.classList.remove('hidden');
        title.textContent = `Piloto: ${pilotName}`;

        // Adiciona o botão "Voltar"
        header.innerHTML = `<button id="history-back-btn" class="btn btn-secondary">Voltar</button>`;
        document.getElementById('history-back-btn').onclick = () => {
            UI.showView(fromView); // Volta para a tela de onde veio
        };

        const history = await DB.getHistory(pilotId);
        loading.classList.add('hidden');

        if (history.length === 0) {
            list.innerHTML = '<p>Nenhum histórico de fechamento encontrado.</p>';
            return;
        }

        history.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'history-item';
            
            itemEl.innerHTML = `
                <div class="history-item-info">
                    <span>${new Date(item.month_reference + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                    <span>Total: R$ ${parseFloat(item.total_amount).toFixed(2)}</span>
                </div>
                <button class="btn btn-primary btn-small download-pdf-btn" data-path="${item.pdf_path}">Baixar PDF</button>
            `;
            list.appendChild(itemEl);
        });

        // Adiciona listeners aos botões de download
        this.addHistoryEventListeners();
        UI.showView('history-view'); // Mostra a tela
    },

    /**
     * NOVO: Adiciona listeners aos botões de Download de PDF
     */
    addHistoryEventListeners() {
        document.querySelectorAll('.download-pdf-btn').forEach(btn => {
            btn.onclick = (e) => {
                const pdfPath = e.currentTarget.dataset.path;
                const pdfUrl = DB.getPdfUrl(pdfPath);
                window.open(pdfUrl, '_blank'); // Abre o PDF em uma nova aba
            };
        });
    },

    /**
     * Cria o Card para a view de Admin (com botão de Histórico)
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
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
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
                <button class="btn btn-secondary btn-small admin-history-btn" data-pilot-id="${pilot.id}" data-pilot-name="${pilot.name}">Histórico</button>
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

        scope.querySelectorAll('.delete-pilot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => App.handleDeletePilot(e.target.dataset.pilotId, e.target.dataset.pilotName));
        });
        
        // Listener para o Histórico do Admin
        scope.querySelectorAll('.admin-history-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pilotId = e.target.dataset.pilotId;
                const pilotName = e.target.dataset.pilotName;
                App.handleViewHistory(pilotId, pilotName, 'admin-dashboard-view'); // Vem do admin
            });
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