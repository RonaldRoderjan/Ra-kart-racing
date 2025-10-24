// js/ui.js

const UI = {
    // --- Gerenciamento de Telas (Views) ---
    showView(viewId) {
        console.log(`[DEBUG] UI.showView chamado para: ${viewId}`);
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        const viewElement = document.getElementById(viewId);
        if (viewElement) {
            viewElement.classList.add('active');
        } else {
            console.error(`[DEBUG] Tentativa de mostrar view inexistente: ${viewId}`);
        }
    },

    // --- Gerenciamento de Modais ---
    openModal(modalId) { document.getElementById(modalId)?.classList.add('active'); },
    closeModal(modalId) { document.getElementById(modalId)?.classList.remove('active'); },

    // --- Renderização do Dashboard (ADMIN) ---
    async renderAdminDashboard() {
        console.log('[DEBUG] UI.renderAdminDashboard iniciado.');
        const grid = document.getElementById('admin-dashboard-grid'); 
        const loading = document.getElementById('dashboard-loading');
        if (!grid || !loading) {
            console.error('[DEBUG] Elementos do Admin Dashboard não encontrados!');
            return;
        }
        
        grid.innerHTML = ''; 
        loading.classList.remove('hidden');
        
        const pilots = await DB.getPilots(); 
        console.log('[DEBUG] Pilotos buscados para Admin Dashboard:', pilots.length);
        
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
        console.log('[DEBUG] UI.renderAdminDashboard finalizado.');
    },

    // --- Renderização do Dashboard (PILOTO) ---
    async renderPilotDashboard() {
        console.log('[DEBUG] UI.renderPilotDashboard iniciado.');
        const content = document.getElementById('pilot-content');
        const loading = document.getElementById('pilot-loading');
        if (!content || !loading) {
            console.error('[DEBUG] Elementos do Pilot Dashboard não encontrados!');
            return;
        }

        content.innerHTML = '';
        loading.classList.remove('hidden');
        
        let pilots = [];
        try {
            pilots = await DB.getPilots(); 
            console.log('[DEBUG] Pilotos buscados para Pilot Dashboard:', pilots.length);
        } catch (error) {
            console.error('[DEBUG] Erro ao buscar dados para Pilot Dashboard:', error);
            content.innerHTML = '<p>Erro ao carregar seus dados. Tente recarregar a página.</p>';
            loading.classList.add('hidden');
            return;
        }
        
        loading.classList.add('hidden');

        if (pilots.length === 0) {
            content.innerHTML = '<p>Erro: Nenhum piloto associado a esta conta. Contate o administrador.</p>';
            return;
        }
        if (pilots.length > 1) {
             console.warn('[DEBUG] Mais de um piloto encontrado para esta conta. Usando o primeiro.');
        }

        const myPilot = pilots[0]; // myPilot AGORA CONTÉM pilot.*, expenses[], reimbursements[]
        const totals = DB.calculateTotals(myPilot);

        // Renderiza a view do piloto
        content.innerHTML = `
            <h2>Olá, ${myPilot.name}!</h2>
            <p>Aqui está seu resumo financeiro para este mês.</p>
            
            <div class="pilot-card" style="margin-top: 1rem;">
                <div class="card-header">
                    <h3>Resumo do Mês</h3>
                    <span class="pilot-category">${myPilot.category || 'N/A'}</span>
                </div>
                <div class="card-body">
                    <div class="data-point">
                        Mensalidade
                        <span>R$ ${parseFloat(myPilot.baseFee || 0).toFixed(2)}</span>
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
                    <button class="btn btn-primary" id="view-statement-btn">Ver Extrato Detalhado</button> <button class="btn btn-secondary" id="view-history-btn" data-pilot-id="${myPilot.id}" data-pilot-name="${myPilot.name}">Ver Histórico</button>
                </div>
            </div>

            <div class="payment-area" style="margin-top: 2rem; padding: 1rem; background-color: var(--color-surface); border-radius: var(--border-radius);">
                <h3>Pagamento via PIX</h3>
                <p>Valor Total: <strong>R$ ${totals.totalMonth.toFixed(2)}</strong></p>
                <p style="margin-top: 10px;">Chave PIX (CNPJ):</p>
                <p><strong>12.345.678/0001-99</strong></p>
            </div>
        `;
        
        // --- ADICIONA LISTENERS AOS BOTÕES DO PILOTO ---
        const historyBtn = document.getElementById('view-history-btn');
        if (historyBtn) {
            historyBtn.onclick = (e) => {
                const pilotId = e.currentTarget.dataset.pilotId; 
                const pilotName = e.currentTarget.dataset.pilotName;
                console.log('[DEBUG] Botão "Ver Histórico" (Piloto) clicado.'); 
                App.handleViewHistory(pilotId, pilotName, 'pilot-dashboard-view'); 
            };
            console.log('[DEBUG] Listener para view-history-btn (Piloto) adicionado.');
        } else {
             console.error('[DEBUG] Botão view-history-btn (Piloto) não encontrado após renderizar.');
        }

        // NOVO: Listener para o botão de Extrato Detalhado
        const statementBtn = document.getElementById('view-statement-btn');
        if (statementBtn) {
            statementBtn.onclick = () => {
                console.log('[DEBUG] Botão "Ver Extrato Detalhado" (Piloto) clicado.');
                this.renderStatementModal(myPilot); // Passa o objeto piloto completo
                this.openModal('statement-modal');
            };
             console.log('[DEBUG] Listener para view-statement-btn (Piloto) adicionado.');
        } else {
             console.error('[DEBUG] Botão view-statement-btn (Piloto) não encontrado após renderizar.');
        }

        console.log('[DEBUG] UI.renderPilotDashboard finalizado.');
    },

    /**
     * NOVO: Renderiza o conteúdo do Modal de Extrato Detalhado
     */
    renderStatementModal(pilotData) {
        console.log('[DEBUG][renderStatementModal] Iniciado com dados:', pilotData);
        const contentEl = document.getElementById('statement-modal-content');
        if (!contentEl) {
            console.error('[DEBUG][renderStatementModal] Elemento #statement-modal-content não encontrado!');
            return;
        }

        const totals = DB.calculateTotals(pilotData); // Recalcula totais (seguro)
        let html = '';

        // Seção de Resumo
        html += `
            <h4>Resumo</h4>
            <div class="statement-summary">
                <p><span>Mensalidade Base:</span> <span>R$ ${parseFloat(pilotData.baseFee || 0).toFixed(2)}</span></p>
                <p><span>(+) Total Gastos Extras:</span> <span style="color: var(--color-danger);">R$ ${totals.totalExpenses.toFixed(2)}</span></p>
                <p><span>(-) Total Reembolsos:</span> <span style="color: var(--color-success);">R$ ${totals.totalReimbursements.toFixed(2)}</span></p>
                <hr style="border-color: var(--color-surface-light); margin: 10px 0;">
                <p><strong>Total a Pagar:</strong> <strong>R$ ${totals.totalMonth.toFixed(2)}</strong></p>
            </div>
        `;

        // Seção de Gastos Extras
        const expenses = pilotData.expenses || []; // Garante que é um array
        if (expenses.length > 0) {
            html += `<h4>Gastos Extras Detalhados</h4>`;
            html += `<table class="statement-table"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>`;
            expenses.forEach(item => {
                const itemDate = new Date(item.created_at);
                const formattedDate = itemDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }); // Use UTC para consistência
                html += `<tr><td>${formattedDate}</td><td>${item.description || 'N/A'}</td><td>R$ ${parseFloat(item.amount || 0).toFixed(2)}</td></tr>`;
            });
            html += `</tbody></table>`;
        } else {
            html += `<h4>Gastos Extras Detalhados</h4><p>Nenhum gasto extra registrado neste mês.</p>`;
        }

        // Seção de Reembolsos
        const reimbursements = pilotData.reimbursements || []; // Garante que é um array
        if (reimbursements.length > 0) {
            html += `<h4>Reembolsos Detalhados</h4>`;
            html += `<table class="statement-table"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>`;
            reimbursements.forEach(item => {
                 const itemDate = new Date(item.created_at);
                 const formattedDate = itemDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }); // Use UTC para consistência
                html += `<tr><td>${formattedDate}</td><td>${item.description || 'N/A'}</td><td>R$ ${parseFloat(item.amount || 0).toFixed(2)}</td></tr>`;
            });
            html += `</tbody></table>`;
        } else {
             html += `<h4>Reembolsos Detalhados</h4><p>Nenhum reembolso registrado neste mês.</p>`;
        }

        contentEl.innerHTML = html;
        console.log('[DEBUG][renderStatementModal] Conteúdo renderizado.');
    },
    
    /**
     * Renderiza a tela de Histórico
     */
    async renderHistory(pilotId, pilotName, fromView) {
        console.log(`[DEBUG][renderHistory] INICIADO para ${pilotName}, vindo de ${fromView}`); 
        
        const historyView = document.getElementById('history-view');
        if (!historyView) { console.error('[DEBUG][renderHistory] ERRO FATAL: A section #history-view não existe!'); return; }
        console.log('[DEBUG][renderHistory] Section #history-view encontrada.');

        const list = document.getElementById('history-list');
        const loading = document.getElementById('history-loading');
        const title = document.getElementById('history-pilot-name');
        const headerActions = historyView.querySelector('.app-header .header-actions'); 
        
        if (!list || !loading || !title || !headerActions) { 
            console.error('[DEBUG][renderHistory] Elementos internos não encontrados!'); 
            if (!list) console.error('Falta: #history-list'); if (!loading) console.error('Falta: #history-loading'); if (!title) console.error('Falta: #history-pilot-name'); if (!headerActions) console.error('Falta: .header-actions');
            return; 
        }
        console.log('[DEBUG][renderHistory] Elementos internos encontrados.');

        // Limpa e prepara
        list.innerHTML = ''; loading.classList.remove('hidden'); title.textContent = `Piloto: ${pilotName}`;

        // Botão Voltar
        console.log('[DEBUG][renderHistory] Adicionando botão Voltar...');
        headerActions.innerHTML = `<button id="history-back-btn" class="btn btn-secondary">Voltar</button>`;
        const backBtn = document.getElementById('history-back-btn');
        if (backBtn) { backBtn.onclick = () => { UI.showView(fromView); }; console.log('[DEBUG][renderHistory] Listener Voltar adicionado.'); } 
        else { console.error('[DEBUG][renderHistory] Botão Voltar não encontrado!'); }

        // Busca dados
        console.log('[DEBUG][renderHistory] Chamando DB.getHistory...'); 
        let history = [];
        try { history = await DB.getHistory(pilotId); console.log('[DEBUG][renderHistory] Recebeu do DB:', history); } 
        catch (dbError) { console.error('[DEBUG][renderHistory] Erro DB.getHistory:', dbError); list.innerHTML = '<p>Erro ao carregar histórico.</p>'; loading.classList.add('hidden'); UI.showView('history-view'); return; }
        loading.classList.add('hidden');

        // Renderiza lista
        if (history.length === 0) { list.innerHTML = '<p>Nenhum histórico encontrado.</p>'; } 
        else { console.log('[DEBUG][renderHistory] Renderizando itens...');
            history.forEach((item, index) => { /* ... cria item HTML ... */ 
                 if (!item || !item.month_reference || typeof item.total_amount === 'undefined' || !item.pdf_path) { console.warn(`Item ${index} inválido:`, item); return; }
                 const itemEl = document.createElement('div'); itemEl.className = 'history-item';
                 try { const dateParts = item.month_reference.split('-'); const itemDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, 15); const formattedDate = itemDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
                 itemEl.innerHTML = `<div class="history-item-info"><span>${formattedDate}</span><span>Total: R$ ${parseFloat(item.total_amount).toFixed(2)}</span></div><button class="btn btn-primary btn-small download-pdf-btn" data-path="${item.pdf_path}">Baixar PDF</button>`; list.appendChild(itemEl); } 
                 catch (formatError) { console.error(`Erro format/render item ${index}:`, formatError, item); }
             });
            console.log('[DEBUG][renderHistory] Itens renderizados. Add listeners...'); this.addHistoryEventListeners(); 
        }
        console.log('[DEBUG][renderHistory] Mostrando view history-view...'); UI.showView('history-view'); console.log('[DEBUG][renderHistory] FINALIZADO.'); 
    },

    /**
     * Adiciona listeners aos botões de Download de PDF
     */
    addHistoryEventListeners() {
        const downloadButtons = document.querySelectorAll('#history-list .download-pdf-btn');
         console.log(`[DEBUG][addHistoryListeners] ${downloadButtons.length} botões encontrados.`);
        downloadButtons.forEach(btn => {
            btn.onclick = null; // Remove listener antigo
            btn.onclick = (e) => { /* ... código idêntico ... */ 
                const pdfPath = e.currentTarget.dataset.path; console.log(`Download clicado. Path: ${pdfPath}`); if (!pdfPath) { alert('Erro: Path não encontrado.'); return; }
                try { const pdfUrl = DB.getPdfUrl(pdfPath); console.log(`URL: ${pdfUrl}`); if (pdfUrl) { window.open(pdfUrl, '_blank'); } else { alert('Erro URL.'); } } 
                catch(urlError) { console.error('Erro getPdfUrl:', urlError); alert('Erro URL.'); }
             };
        });
         console.log('[DEBUG][addHistoryListeners] Listeners adicionados/atualizados.');
    },

    /**
     * Cria o Card para a view de Admin (com botão de Histórico)
     */
    createAdminPilotCard(pilot) {
         const totals = DB.calculateTotals(pilot); const card = document.createElement('div'); card.className = 'pilot-card'; card.setAttribute('data-pilot-id', pilot.id);
         card.innerHTML = `<div class="card-header"><div><h3>${pilot.name}</h3><span class="pilot-category">${pilot.category || 'N/A'}</span></div><div style="display: flex; gap: 5px; flex-wrap: wrap;"><button class="btn btn-secondary btn-small edit-pilot-btn" data-pilot-id="${pilot.id}">Editar</button><button class="btn btn-danger btn-small delete-pilot-btn" data-pilot-id="${pilot.id}" data-pilot-name="${pilot.name}">Excluir</button></div></div><div class="card-body"><div class="data-point">Mensalidade<span>R$ ${parseFloat(pilot.baseFee || 0).toFixed(2)}</span></div><div class="data-point expenses">Gastos Extras<span>R$ ${totals.totalExpenses.toFixed(2)}</span></div><div class="data-point reimbursements">Reembolsos<span>R$ ${totals.totalReimbursements.toFixed(2)}</span></div><div class="data-point total">Total do Mês<span>R$ ${totals.totalMonth.toFixed(2)}</span></div></div><div class="card-footer"><button class="btn btn-primary add-expense-btn" data-pilot-id="${pilot.id}">+ Gasto</button><button class="btn btn-secondary add-reimbursement-btn" data-pilot-id="${pilot.id}">Reembolso</button><button class="btn btn-secondary btn-small admin-history-btn" data-pilot-id="${pilot.id}" data-pilot-name="${pilot.name}">Histórico</button></div>`; return card;
    },

    /**
     * Adiciona Listeners para os botões do card de Admin
     */
    addAdminCardEventListeners(scope = document) {
       // ... (código idêntico ao v11, com .onclick) ...
       scope.querySelectorAll('.add-expense-btn, .add-reimbursement-btn, .edit-pilot-btn, .delete-pilot-btn, .admin-history-btn').forEach(btn => btn.onclick = null);
       scope.querySelectorAll('.add-expense-btn').forEach(btn => btn.onclick = (e) => App.handleOpenExpenseModal(e.currentTarget.dataset.pilotId));
       scope.querySelectorAll('.add-reimbursement-btn').forEach(btn => btn.onclick = (e) => App.handleOpenReimbursementModal(e.currentTarget.dataset.pilotId));
       scope.querySelectorAll('.edit-pilot-btn').forEach(btn => btn.onclick = (e) => App.handleOpenEditPilotModal(e.currentTarget.dataset.pilotId));
       scope.querySelectorAll('.delete-pilot-btn').forEach(btn => btn.onclick = (e) => App.handleDeletePilot(e.currentTarget.dataset.pilotId, e.currentTarget.dataset.pilotName));
       scope.querySelectorAll('.admin-history-btn').forEach(btn => btn.onclick = (e) => { const pilotId = e.currentTarget.dataset.pilotId; const pilotName = e.currentTarget.dataset.pilotName; console.log('[DEBUG] Botão "Histórico" (Admin) clicado.'); App.handleViewHistory(pilotId, pilotName, 'admin-dashboard-view'); });
       console.log(`[DEBUG] Listeners de Admin adicionados/atualizados.`);
    },
    
    // --- Preenchimento de Formulários (Admin) ---
    async populatePilotForm(pilot) { 
        document.getElementById('pilot-modal-title').textContent = 'Editar Piloto';
        document.getElementById('pilot-id').value = pilot.id; 
        document.getElementById('pilot-name').value = pilot.name || '';
        document.getElementById('pilot-category').value = pilot.category || '';
        document.getElementById('pilot-fee').value = pilot.baseFee || 0;
        document.getElementById('pilot-closing-date').value = pilot.closingDate || 1;
        document.getElementById('pilot-obs').value = pilot.observations || '';
     },
    resetPilotForm() { 
        document.getElementById('pilot-modal-title').textContent = 'Novo Piloto';
        document.getElementById('pilot-form').reset();
        document.getElementById('pilot-id').value = ''; 
     }
};