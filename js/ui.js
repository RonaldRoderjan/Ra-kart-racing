// js/ui.js (v14-local-pix-colorfix - Revisado)

const UI = {
    // --- Gerenciamento de Telas (Views) ---
    showView(viewId) {
        // console.log(`[DEBUG] UI.showView: ${viewId}`); // Log opcional
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        const viewElement = document.getElementById(viewId);
        if (viewElement) viewElement.classList.add('active');
        else console.error(`[DEBUG] View ${viewId} não encontrada!`);
    },

    // --- Gerenciamento de Modais ---
    openModal(modalId) { document.getElementById(modalId)?.classList.add('active'); },
    closeModal(modalId) { document.getElementById(modalId)?.classList.remove('active'); },

    // --- Renderização do Dashboard (ADMIN) ---
    async renderAdminDashboard() {
        // console.log('[DEBUG] UI.renderAdminDashboard iniciado.'); // Log opcional
        const grid = document.getElementById('admin-dashboard-grid');
        const loading = document.getElementById('dashboard-loading');
        if (!grid || !loading) { console.error('[DEBUG] Elementos Admin não encontrados!'); return; }

        grid.innerHTML = ''; loading.classList.remove('hidden');
        let pilots = [];
        try { pilots = await DB.getPilots(); /* console.log('[DEBUG] Pilotos Admin:', pilots.length); */ }
        catch (error) { console.error('[DEBUG] Erro busca Admin:', error); grid.innerHTML = '<p>Erro carregar pilotos.</p>'; loading.classList.add('hidden'); return; }
        loading.classList.add('hidden');

        if (!pilots || pilots.length === 0) { grid.innerHTML = '<p>Nenhum piloto.</p>'; return; }

        pilots.forEach((pilot, index) => {
            if (!pilot || !pilot.id) { console.warn(`Piloto inválido ${index}`); return; }
            try { const card = this.createAdminPilotCard(pilot); grid.appendChild(card); }
            catch (cardError) { console.error(`Erro criar card ${pilot.name}:`, cardError); }
        });
        this.addAdminCardEventListeners();
        // console.log('[DEBUG] UI.renderAdminDashboard finalizado.'); // Log opcional
    },

    // --- Renderização do Dashboard (PILOTO) ---
    async renderPilotDashboard() {
        console.log('[DEBUG] UI.renderPilotDashboard iniciado.');
        const content = document.getElementById('pilot-content');
        const loading = document.getElementById('pilot-loading');
        if (!content || !loading) { console.error('[DEBUG] Elementos Pilot não encontrados!'); return; }

        content.innerHTML = ''; loading.classList.remove('hidden');
        let pilots = [];
        try { pilots = await DB.getPilots(); console.log('[DEBUG] Pilotos Pilot:', pilots.length); }
        catch (error) { console.error('[DEBUG] Erro busca Pilot:', error); content.innerHTML = '<p>Erro carregar dados.</p>'; loading.classList.add('hidden'); return; }
        loading.classList.add('hidden');

        if (pilots.length === 0) { content.innerHTML = '<p>Erro: Nenhum piloto associado.</p>'; return; }
        if (pilots.length > 1) { console.warn('[DEBUG] Mais de um piloto encontrado.'); }

        const myPilot = pilots[0]; const totals = DB.calculateTotals(myPilot);
        const pixKey = "12.345.678/0001-99"; // Chave PIX (MUDE AQUI)

        // Renderiza a view do piloto com a nova área PIX (layout Flex)
        content.innerHTML = `
            <h2>Olá, ${myPilot.name}!</h2>
            <p>Aqui está seu resumo financeiro para este mês.</p>

            <div class="pilot-card" style="margin-top: 1rem;">
                <div class="card-header"><h3>Resumo Mês</h3><span class="pilot-category">${myPilot.category || 'N/A'}</span></div>
                <div class="card-body">
                    <div class="data-point">Mensalidade<span>R$ ${parseFloat(myPilot.baseFee || 0).toFixed(2)}</span></div>
                    <div class="data-point expenses">Gastos Extras<span>R$ ${totals.totalExpenses.toFixed(2)}</span></div>
                    <div class="data-point reimbursements">Reembolsos<span>R$ ${totals.totalReimbursements.toFixed(2)}</span></div>
                    <div class="data-point total">Total Mês<span>R$ ${totals.totalMonth.toFixed(2)}</span></div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary" id="view-statement-btn">Ver Extrato Detalhado</button>
                    <button class="btn btn-secondary" id="view-history-btn" data-pilot-id="${myPilot.id}" data-pilot-name="${myPilot.name}">Ver Histórico</button>
                </div>
            </div>

            <div class="payment-area">
                <h3>Pagamento via PIX</h3>
                <div class="pix-content">
                    <div class="pix-qrcode-container">
                        <div id="pix-qrcode"></div>
                        <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 5px;">Escaneie o QR Code (sem valor)</p>
                    </div>
                    <div class="pix-details">
                        <p class="total-value">R$ ${totals.totalMonth.toFixed(2)}</p>
                        <p>Chave PIX (CNPJ):</p>
                        <div class="pix-key-area">
                            <span id="pix-key-text">${pixKey}</span>
                            <button class="btn btn-secondary btn-small" id="copy-pix-key-btn">Copiar Chave</button>
                        </div>
                    </div>
                </div>
            </div>
            `;

        // --- Adiciona Listeners ---
        const historyBtn = document.getElementById('view-history-btn');
        if (historyBtn) { historyBtn.onclick = (e) => { App.handleViewHistory(e.currentTarget.dataset.pilotId, e.currentTarget.dataset.pilotName, 'pilot-dashboard-view'); }; }
        const statementBtn = document.getElementById('view-statement-btn');
        if (statementBtn) { statementBtn.onclick = () => { this.renderStatementModal(myPilot); this.openModal('statement-modal'); }; }

        // --- GERAR QR CODE e BOTÃO COPIAR ---
        try {
            const qrCodeElement = document.getElementById('pix-qrcode');
            console.log('[DEBUG] Tentando gerar QR Code. Lib QRCode definida?', typeof QRCode);

            if (qrCodeElement && typeof QRCode !== 'undefined') {
                qrCodeElement.innerHTML = ''; // Limpa antes

                // ***** CORREÇÃO DA COR *****
                new QRCode(qrCodeElement, {
                    text: pixKey,
                    width: 128, // Reduzido um pouco para caber ao lado
                    height: 128,
                    colorDark : "#000000", // Pontos PRETOS <<-- CORRIGIDO AQUI
                    colorLight : "#FFFFFF", // Fundo BRANCO (ignorado pelo CSS, mas bom ter)
                    correctLevel : QRCode.CorrectLevel.H
                });
                // **************************

                // LOG EXTRA: Verifica se o elemento interno foi criado
                setTimeout(() => { // Adiciona delay para garantir renderização
                    const innerElement = qrCodeElement.querySelector('img') || qrCodeElement.querySelector('canvas');
                    if (innerElement) {
                        console.log('[DEBUG] QR Code gerado! Elemento interno:', innerElement.tagName);
                    } else {
                        console.error('[DEBUG] ERRO: QR Code não renderizou elemento interno.');
                        qrCodeElement.innerHTML = '<p style="color:red;">Falha render QR.</p>';
                    }
                }, 100); // Delay de 100ms

            } else if (!qrCodeElement) { console.error('[DEBUG] #pix-qrcode não encontrado.'); }
            else if (typeof QRCode === 'undefined') { console.error('[DEBUG] Lib QRCode não carregada.'); if(qrCodeElement) qrCodeElement.innerHTML = '<p style="color:red;">Erro QR Lib.</p>'; }

            const copyBtn = document.getElementById('copy-pix-key-btn');
            if (copyBtn) {
                copyBtn.onclick = () => {
                     if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(pixKey).then(() => {
                            copyBtn.textContent = 'Copiado!'; setTimeout(() => { copyBtn.textContent = 'Copiar Chave'; }, 2000);
                        }).catch(err => { console.error('Falha ao copiar:', err); alert('Não foi possível copiar.'); });
                    } else { alert('Função Copiar não suportada.'); }
                };
            } else { console.error('[DEBUG] Botão #copy-pix-key-btn não encontrado.'); }
        } catch (qrError) {
             console.error('[DEBUG] Erro GERAL QR/Cópia:', qrError);
             const qrEl = document.getElementById('pix-qrcode');
             if(qrEl) qrEl.innerHTML = '<p style="color:red;">Erro gerar QR.</p>';
        }

        console.log('[DEBUG] UI.renderPilotDashboard finalizado.');
    },

    /**
     * Renderiza o conteúdo do Modal de Extrato Detalhado
     */
    renderStatementModal(pilotData) {
        console.log('[DEBUG][renderStatementModal] Iniciado.'); const contentEl = document.getElementById('statement-modal-content'); if (!contentEl) { console.error('[DEBUG][renderStatementModal] #statement-modal-content não encontrado!'); return; }
        const totals = DB.calculateTotals(pilotData); let html = '';
        html += `<h4>Resumo</h4><div class="statement-summary"><p><span>Mensalidade:</span> <span>R$ ${parseFloat(pilotData.baseFee || 0).toFixed(2)}</span></p><p><span>(+) Gastos:</span> <span style="color: var(--color-danger);">R$ ${totals.totalExpenses.toFixed(2)}</span></p><p><span>(-) Reembolsos:</span> <span style="color: var(--color-success);">R$ ${totals.totalReimbursements.toFixed(2)}</span></p><hr style="border-color: var(--color-surface-light); margin: 10px 0;"><p><strong>Total:</strong> <strong>R$ ${totals.totalMonth.toFixed(2)}</strong></p></div>`;
        const expenses = pilotData.expenses || []; if (expenses.length > 0) { html += `<h4>Gastos Detalhados</h4><table class="statement-table"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>`; expenses.forEach(item => { const dt=new Date(item.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'UTC'}); html += `<tr><td>${dt}</td><td>${item.description||'N/A'}</td><td>R$ ${parseFloat(item.amount||0).toFixed(2)}</td></tr>`; }); html += `</tbody></table>`; } else { html += `<h4>Gastos Detalhados</h4><p>Nenhum gasto.</p>`; }
        const reimbursements = pilotData.reimbursements || []; if (reimbursements.length > 0) { html += `<h4>Reembolsos Detalhados</h4><table class="statement-table"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>`; reimbursements.forEach(item => { const dt=new Date(item.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'UTC'}); html += `<tr><td>${dt}</td><td>${item.description||'N/A'}</td><td>R$ ${parseFloat(item.amount||0).toFixed(2)}</td></tr>`; }); html += `</tbody></table>`; } else { html += `<h4>Reembolsos Detalhados</h4><p>Nenhum reembolso.</p>`; }
        contentEl.innerHTML = html; // console.log('[DEBUG][renderStatementModal] Conteúdo renderizado.'); // Log opcional
     },

    /**
     * Renderiza a tela de Histórico
     */
    async renderHistory(pilotId, pilotName, fromView) {
        // console.log(`[DEBUG][renderHistory] INICIADO ${pilotName}, from ${fromView}`); // Log opcional
        const historyView = document.getElementById('history-view'); if (!historyView) { console.error('[DEBUG][renderHistory] #history-view não existe!'); return; }
        const list=document.getElementById('history-list'); const loading=document.getElementById('history-loading'); const title=document.getElementById('history-pilot-name'); const headerActions=historyView.querySelector('.app-header .header-actions');
        if (!list || !loading || !title || !headerActions) { console.error('[DEBUG][renderHistory] Elementos internos não encontrados!'); return; }
        list.innerHTML = ''; loading.classList.remove('hidden'); title.textContent = `Piloto: ${pilotName}`;
        headerActions.innerHTML = `<button id="history-back-btn" class="btn btn-secondary">Voltar</button>`; const backBtn = document.getElementById('history-back-btn'); if (backBtn) { backBtn.onclick = () => { UI.showView(fromView); }; }
        // console.log('[DEBUG][renderHistory] Chamando DB.getHistory...'); // Log opcional
        let history = []; try { history = await DB.getHistory(pilotId); /* console.log('[DEBUG][renderHistory] Recebeu:', history); */ } catch (dbError) { console.error('[DEBUG][renderHistory] Erro DB:', dbError); list.innerHTML='<p>Erro histórico.</p>'; loading.classList.add('hidden'); UI.showView('history-view'); return; } loading.classList.add('hidden');
        if (history.length === 0) { list.innerHTML = '<p>Nenhum histórico.</p>'; } else { /* console.log('[DEBUG][renderHistory] Renderizando itens...'); */ history.forEach((item, index) => { if (!item || !item.month_reference || typeof item.total_amount==='undefined' || !item.pdf_path) { console.warn(`Item ${index} inválido:`, item); return; } const itemEl = document.createElement('div'); itemEl.className = 'history-item'; try { const dp=item.month_reference.split('-'); const dt=new Date(parseInt(dp[0]), parseInt(dp[1])-1, 15); const fmtDt=dt.toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}); itemEl.innerHTML = `<div class="history-item-info"><span>${fmtDt}</span><span>Total: R$ ${parseFloat(item.total_amount).toFixed(2)}</span></div><button class="btn btn-primary btn-small download-pdf-btn" data-path="${item.pdf_path}">Baixar PDF</button>`; list.appendChild(itemEl); } catch (fmtErr) { console.error(`Erro format item ${index}:`, fmtErr, item); } }); this.addHistoryEventListeners(); }
        // console.log('[DEBUG][renderHistory] Mostrando view history-view...'); // Log opcional
         UI.showView('history-view');
         // console.log('[DEBUG][renderHistory] FINALIZADO.'); // Log opcional
    },

    /**
     * Adiciona listeners aos botões de Download de PDF
     */
    addHistoryEventListeners() {
         const downloadButtons = document.querySelectorAll('#history-list .download-pdf-btn'); /* console.log(`[DEBUG][addHistoryListeners] ${downloadButtons.length} botões.`); */ downloadButtons.forEach(btn => { btn.onclick = null; btn.onclick = (e) => { const pdfPath = e.currentTarget.dataset.path; /* console.log(`Download clicado: ${pdfPath}`); */ if (!pdfPath) { alert('Erro path.'); return; } try { const pdfUrl = DB.getPdfUrl(pdfPath); /* console.log(`URL: ${pdfUrl}`); */ if (pdfUrl) { window.open(pdfUrl, '_blank'); } else { alert('Erro URL.'); } } catch(urlError) { console.error('Erro getPdfUrl:', urlError); alert('Erro URL.'); } }; }); /* console.log('[DEBUG][addHistoryListeners] Listeners adicionados.'); */
    },

    /**
     * Cria o Card para a view de Admin
     */
    createAdminPilotCard(pilot) {
         const totals = DB.calculateTotals(pilot); const card = document.createElement('div'); card.className = 'pilot-card'; card.setAttribute('data-pilot-id', pilot.id);
         card.innerHTML = `<div class="card-header"><div><h3>${pilot.name}</h3><span class="pilot-category">${pilot.category || 'N/A'}</span></div><div style="display: flex; gap: 5px; flex-wrap: wrap;"><button class="btn btn-secondary btn-small edit-pilot-btn" data-pilot-id="${pilot.id}">Editar</button><button class="btn btn-danger btn-small delete-pilot-btn" data-pilot-id="${pilot.id}" data-pilot-name="${pilot.name}">Excluir</button></div></div><div class="card-body"><div class="data-point">Mensalidade<span>R$ ${parseFloat(pilot.baseFee || 0).toFixed(2)}</span></div><div class="data-point expenses">Gastos Extras<span>R$ ${totals.totalExpenses.toFixed(2)}</span></div><div class="data-point reimbursements">Reembolsos<span>R$ ${totals.totalReimbursements.toFixed(2)}</span></div><div class="data-point total">Total do Mês<span>R$ ${totals.totalMonth.toFixed(2)}</span></div></div><div class="card-footer"><button class="btn btn-primary add-expense-btn" data-pilot-id="${pilot.id}">+ Gasto</button><button class="btn btn-secondary add-reimbursement-btn" data-pilot-id="${pilot.id}">Reembolso</button><button class="btn btn-secondary btn-small admin-history-btn" data-pilot-id="${pilot.id}" data-pilot-name="${pilot.name}">Histórico</button></div>`; return card;
    },

    /**
     * Adiciona Listeners para os botões do card de Admin
     */
    addAdminCardEventListeners(scope = document) {
       scope.querySelectorAll('.add-expense-btn, .add-reimbursement-btn, .edit-pilot-btn, .delete-pilot-btn, .admin-history-btn').forEach(btn => btn.onclick = null);
       scope.querySelectorAll('.add-expense-btn').forEach(btn => btn.onclick = (e) => App.handleOpenExpenseModal(e.currentTarget.dataset.pilotId));
       scope.querySelectorAll('.add-reimbursement-btn').forEach(btn => btn.onclick = (e) => App.handleOpenReimbursementModal(e.currentTarget.dataset.pilotId));
       scope.querySelectorAll('.edit-pilot-btn').forEach(btn => btn.onclick = (e) => App.handleOpenEditPilotModal(e.currentTarget.dataset.pilotId));
       scope.querySelectorAll('.delete-pilot-btn').forEach(btn => btn.onclick = (e) => App.handleDeletePilot(e.currentTarget.dataset.pilotId, e.currentTarget.dataset.pilotName));
       scope.querySelectorAll('.admin-history-btn').forEach(btn => btn.onclick = (e) => { const pilotId = e.currentTarget.dataset.pilotId; const pilotName = e.currentTarget.dataset.pilotName; App.handleViewHistory(pilotId, pilotName, 'admin-dashboard-view'); });
       // console.log(`[DEBUG] Listeners de Admin adicionados/atualizados.`); // Removido log repetitivo
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