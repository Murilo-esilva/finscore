/**
 * modules/maps.js
 * ---------------------------------------------------------
 * STUB — Etapa 1 (estrutura do projeto).
 * Este módulo será implementado em uma etapa futura do plano
 * de entrega do FinScore, conforme "Forma de Entrega" do prompt.
 * A estrutura já existe para manter a arquitetura modular
 * prevista desde o início.
 * ---------------------------------------------------------
 */
/**
 * Filtra despesas de acordo com os critérios
 * @param {Array} despesas - Lista de despesas
 * @param {Object} filtros - { dataInicio, dataFim, categoria, formaPagamento }
 */
export function aplicarFiltrosRelatorio(despesas, filtros) {
  let resultado = [...despesas];
  if (filtros.dataInicio) {
    const dataInicio = new Date(filtros.dataInicio);
    resultado = resultado.filter((d) => new Date(d.dataHora) >= dataInicio);
  }
  if (filtros.dataFim) {
    const dataFim = new Date(filtros.dataFim);
    dataFim.setHours(23, 59, 59, 999);
    resultado = resultado.filter((d) => new Date(d.dataHora) <= dataFim);
  }
  if (filtros.categoria && filtros.categoria !== "todas") {
    resultado = resultado.filter((d) => d.categoria === filtros.categoria);
  }
  if (filtros.formaPagamento && filtros.formaPagamento !== "todas") {
    resultado = resultado.filter((d) => d.formaPagamento === filtros.formaPagamento);
  }
  return resultado;
}
/**
 * Gera resumo estatístico do relatório
 * @param {Array} despesas - Despesas filtradas
 */
export function gerarResumoRelatorio(despesas) {
  if (despesas.length === 0) {
    return { total: 0, media: 0, maiorGasto: 0, menorGasto: 0, totalCategorias: 0 };
  }
  const valores = despesas.map((d) => d.valor || 0);
  const total = valores.reduce((a, b) => a + b, 0);
  return {
    total,
    media: total / despesas.length,
    maiorGasto: Math.max(...valores),
    menorGasto: Math.min(...valores),
    totalCategorias: new Set(despesas.map((d) => d.categoria)).size,
    numRegistros: despesas.length,
  };
}
/**
 * Exporta para CSV (client-side)
 * @param {Array} despesas - Despesas para exportar
 * @param {string} nomeArquivo - Nome do arquivo (sem extensão)
 */
export function exportarCSV(despesas, nomeArquivo = "relatorio") {
  const headers = ["Data", "Categoria", "Descrição", "Valor", "Forma de Pagamento", "Localização"];
  const linhas = despesas.map((d) => [
    new Date(d.dataHora).toLocaleDateString("pt-BR"),
    d.categoria || "—",
    d.descricao || "—",
    (d.valor || 0).toFixed(2),
    d.formaPagamento || "—",
    d.localidade || "—",
  ]);
  const csv = [
    headers.join(";"),
    ...linhas.map((l) => l.map((v) => `"${v}"`).join(";")),
  ].join("\n");
  // Adicionar BOM para UTF-8
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${nomeArquivo}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
/**
 * Estrutura para exportar PDF (usa jsPDF + autoTable)
 * @param {Array} despesas - Despesas para exportar
 * @param {Object} resumo - Resumo do relatório
 */
export function estruturaPDF(despesas, resumo) {
  console.log("PDF export structure prepared. Implement with jsPDF library.");
  return {
    totalPaginas: Math.ceil(despesas.length / 20),
    despesasPorPagina: 20,
    resumo,
  };
}
/**
 * Estrutura para exportar Excel (usa SheetJS)
 * @param {Array} despesas - Despesas para exportar
 */
export function estruturaExcel(despesas) {
  console.log("Excel export structure prepared. Implement with SheetJS library.");
  return {
    sheets: {
      Despesas: despesas,
      Resumo: {
        total: despesas.reduce((a, b) => a + (b.valor || 0), b),
        quantidade: despesas.length,
      },
    },
  };
}
export default {
  aplicarFiltrosRelatorio,
  gerarResumoRelatorio,
  exportarCSV,
  estruturaPDF,
  estruturaExcel,
};
