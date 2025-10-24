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

    // --- Renderização do Dashboard (AGORA É ASYNC) ---
    async renderDashboard() {
        const grid = document.getElementById('dashboard-grid');
        const loading = document.getElementById('dashboard-loading');
        if (!grid || !loading) return;
        
        grid.innerHTML = ''; // Limpa o grid
        loading.classList.remove('hidden'); // Mostra "Carregando..."
        
        const pilots = await DB.getPilots(); // Busca dados do Supabase
        
        loading.classList.add('hidden'); // Esconde "Carregando..."

        if (pilots.length === 0) {
            grid.innerHTML = '<p>Nenhum piloto cadastrado. Clique em "+ Novo Piloto" para começar.</p>';
            return;
        }

        pilots.forEach(pilot => {
            const card = this.createPilotCard(pilot);
            grid.appendChild(card);
        });

        this.addCardEventListeners();
    },

    // --- Renderização de Card Individual (AGORA É ASYNC) ---
    async updatePilotCard(pilotId) {
        // Em vez de buscar só 1 piloto, é mais eficiente re-renderizar o dashboard
        // para garantir que todos os cálculos do mês estejam corretos.
        // Se a performance fosse um problema, buscaríamos só 1.
        await this.renderDashboard(); 
        
        /* // Abordagem alternativa (mais complexa, mas rápida se houver 100+ pilotos):
        const pilot = await DB.getPilotById(pilotId); // (Precisaria ajustar getPilotById para trazer transações)
        if (!pilot) return;

        const oldCard = document.querySelector(`.pilot-card[data-pilot-id="${pilotId}"]`);
        if (oldCard) {
            const newCard = this.createPilotCard(pilot);
            oldCard.replaceWith(newCard);
            this.addCardEventListeners(newCard); 
        }
        */
    },

    createPilotCard(pilot) {
        // 'pilot' já vem com 'expenses' e 'reimbursements' do mês atual
        const totals = DB.calculateTotals(pilot);

        const card = document.createElement('div');
        card.className = 'pilot-card';
        card.setAttribute('data-pilot-id', pilot.id); // Usa o ID do Supabase
        
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3>${pilot.name}</h3>
                    <span class="pilot-category">${pilot.category}</span>
                </div>
                <button class="btn btn-secondary btn-small edit-pilot-btn" data-pilot-id="${pilot.id}">Editar</button>
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

    // --- Adiciona Listeners aos botões dos cards ---
    addCardEventListeners(scope = document) {
        scope.querySelectorAll('.add-expense-btn').forEach(btn => {
            btn.addEventListener('click', (e) => App.handleOpenExpenseModal(e.target.dataset.pilotId));
        });

        scope.querySelectorAll('.add-reimbursement-btn').forEach(btn => {
            btn.addEventListener('click', (e) => App.handleOpenReimbursementModal(e.target.dataset.pilotId));
        });
        
        scope.querySelectorAll('.edit-pilot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => App.handleOpenEditPilotModal(e.target.dataset.pilotId));
        });
    },
    
    // --- Preenchimento de Formulários ---
    populatePilotForm(pilot) {
        document.getElementById('pilot-modal-title').textContent = 'Editar Piloto';
        document.getElementById('pilot-id').value = pilot.id; // Importante para o Update
        document.getElementById('pilot-name').value = pilot.name;
        document.getElementById('pilot-category').value = pilot.category;
        document.getElementById('pilot-fee').value = pilot.baseFee;
        document.getElementById('pilot-closing-date').value = pilot.closingDate;
        document.getElementById('pilot-obs').value = pilot.observations;
    },
    
    resetPilotForm() {
        document.getElementById('pilot-modal-title').textContent = 'Novo Piloto';
        document.getElementById('pilot-form').reset();
        document.getElementById('pilot-id').value = ''; // Garante que está em modo "Criar"
    }
};