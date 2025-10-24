// js/pdf.js

// Importa as bibliotecas carregadas via CDN
const { jsPDF } = window.jspdf;

const PDF = {
    /**
     * Gera o relatório em PDF e o retorna como um Blob.
     */
    generateReport: async (pilot, totals) => {
        const doc = new jsPDF();
        // Usa o mês atual para referência no PDF gerado na hora
        const currentMonth = new Date();
        const closingMonth = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        
        // 1. Cabeçalho
        // (Adicione seu logo aqui)
        // Ex: doc.addImage(logoBase64, 'PNG', 15, 10, 40, 20);
        
        doc.setFontSize(20);
        doc.text('Relatório de Fechamento Mensal', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Piloto: ${pilot.name}`, 15, 40);
        doc.text(`Categoria: ${pilot.category || 'N/A'}`, 15, 47); // Fallback
        doc.text(`Mês de Referência: ${closingMonth}`, 105, 40, { align: 'center' });
        doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 195, 40, { align: 'right' }); // Mudado para Emissão
        
        doc.setLineWidth(0.5);
        doc.line(15, 55, 195, 55);

        // 2. Resumo Financeiro
        doc.setFontSize(16);
        doc.text('Resumo Financeiro', 15, 65);
        
        doc.setFontSize(12);
        doc.autoTable({
            startY: 70,
            theme: 'striped',
            headStyles: { fillColor: [44, 44, 44] }, // Cor --color-surface
            body: [
                ['Mensalidade Base', `R$ ${parseFloat(pilot.baseFee || 0).toFixed(2)}`],
                ['Total de Gastos Extras', `R$ ${totals.totalExpenses.toFixed(2)}`],
                ['Total de Reembolsos', `(R$ ${totals.totalReimbursements.toFixed(2)})`],
            ],
            foot: [
                [{ content: 'Total a Pagar', styles: { fontStyle: 'bold', fontSize: 14 } }, 
                 { content: `R$ ${totals.totalMonth.toFixed(2)}`, styles: { fontStyle: 'bold', fontSize: 14, fillColor: [0, 200, 83] } }] // Verde
            ]
        });

        let finalY = doc.autoTable.previous.finalY;

        // 3. Detalhamento de Gastos Extras (usa pilot.expenses que já são do mês atual)
        const expenses = pilot.expenses || []; // Garante array
        if (expenses.length > 0) {
            doc.setFontSize(16);
            doc.text('Detalhes: Gastos Extras', 15, finalY + 15);
            doc.autoTable({
                startY: finalY + 20,
                theme: 'grid',
                head: [['Data', 'Descrição', 'Valor (R$)']],
                body: expenses.map(item => [
                    new Date(item.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }), // Usa UTC
                    item.description || 'N/A',
                    parseFloat(item.amount || 0).toFixed(2)
                ]),
                foot: [['', 'Total Extras', totals.totalExpenses.toFixed(2)]]
            });
            finalY = doc.autoTable.previous.finalY;
        }

        // 4. Detalhamento de Reembolsos (usa pilot.reimbursements que já são do mês atual)
        const reimbursements = pilot.reimbursements || []; // Garante array
        if (reimbursements.length > 0) {
            doc.setFontSize(16);
            doc.text('Detalhes: Reembolsos', 15, finalY + 15);
            doc.autoTable({
                startY: finalY + 20,
                theme: 'grid',
                head: [['Data', 'Descrição', 'Valor (R$)']],
                body: reimbursements.map(item => [
                    new Date(item.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }), // Usa UTC
                    item.description || 'N/A',
                    parseFloat(item.amount || 0).toFixed(2)
                ]),
                foot: [['', 'Total Reembolsos', totals.totalReimbursements.toFixed(2)]]
            });
            finalY = doc.autoTable.previous.finalY;
        }
        
        // 5. Rodapé e Instruções de Pagamento
        finalY = finalY > 250 ? (doc.addPage(), 20) : finalY + 20; // Pula página se necessário
        doc.setFontSize(14);
        doc.text('Instruções de Pagamento', 15, finalY);
        doc.setFontSize(10);
        doc.text("Realize o pagamento do valor total até o dia X.", 15, finalY + 7);
        doc.text("PIX da Equipe (CNPJ): 12.345.678/0001-99", 15, finalY + 14);
        // ... outras instruções

        // Retorna o PDF como Blob, pronto para upload
        return doc.output('blob');
    }
};