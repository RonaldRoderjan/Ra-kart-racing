// js/pdf.js (v10)
const { jsPDF } = window.jspdf;
const PDF = {
    generateReport: async (pilot, totals) => {
        const doc = new jsPDF(); const currentMonth = new Date(); const closingMonth = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        doc.setFontSize(20); doc.text('Relatório Fechamento Mensal', 105, 20, { align: 'center' }); doc.setFontSize(12);
        doc.text(`Piloto: ${pilot.name}`, 15, 40); doc.text(`Categoria: ${pilot.category || 'N/A'}`, 15, 47); doc.text(`Mês Ref: ${closingMonth}`, 105, 40, { align: 'center' }); doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 195, 40, { align: 'right' });
        doc.setLineWidth(0.5); doc.line(15, 55, 195, 55); doc.setFontSize(16); doc.text('Resumo Financeiro', 15, 65); doc.setFontSize(12);
        doc.autoTable({ startY: 70, theme: 'striped', headStyles: { fillColor: [44, 44, 44] }, body: [['Mensalidade', `R$ ${parseFloat(pilot.baseFee || 0).toFixed(2)}`], ['Gastos Extras', `R$ ${totals.totalExpenses.toFixed(2)}`], ['Reembolsos', `(R$ ${totals.totalReimbursements.toFixed(2)})`]], foot: [[{ content: 'Total Pagar', styles: { fontStyle: 'bold', fontSize: 14 } }, { content: `R$ ${totals.totalMonth.toFixed(2)}`, styles: { fontStyle: 'bold', fontSize: 14, fillColor: [0, 200, 83] } }]] });
        let finalY = doc.autoTable.previous.finalY; const expenses = pilot.expenses || [];
        if (expenses.length > 0) { doc.setFontSize(16); doc.text('Detalhes: Gastos Extras', 15, finalY + 15); doc.autoTable({ startY: finalY + 20, theme: 'grid', head: [['Data', 'Descrição', 'Valor (R$)']], body: expenses.map(item => [new Date(item.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }), item.description || 'N/A', parseFloat(item.amount || 0).toFixed(2)]), foot: [['', 'Total Extras', totals.totalExpenses.toFixed(2)]] }); finalY = doc.autoTable.previous.finalY; }
        const reimbursements = pilot.reimbursements || [];
        if (reimbursements.length > 0) { doc.setFontSize(16); doc.text('Detalhes: Reembolsos', 15, finalY + 15); doc.autoTable({ startY: finalY + 20, theme: 'grid', head: [['Data', 'Descrição', 'Valor (R$)']], body: reimbursements.map(item => [new Date(item.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }), item.description || 'N/A', parseFloat(item.amount || 0).toFixed(2)]), foot: [['', 'Total Reembolsos', totals.totalReimbursements.toFixed(2)]] }); finalY = doc.autoTable.previous.finalY; }
        finalY = finalY > 250 ? (doc.addPage(), 20) : finalY + 20; doc.setFontSize(14); doc.text('Instruções Pagamento', 15, finalY); doc.setFontSize(10); doc.text("Pagar até dia X.", 15, finalY + 7); doc.text("PIX (CNPJ): 12.345.678/0001-99", 15, finalY + 14); // Mude a chave aqui
        return doc.output('blob');
    }
};