 modules/dashboard.js
 * ---------------------------------------------------------
 * ETAPA 3+4: Renderização do Dashboard com KPIs, metas, 
 * progresso mensal/semanal/diário, score financeiro e gráficos placeholder.
 * ---------------------------------------------------------
 */
import { obterTemaSalvo, formatarMoeda, qs, qsa, pintarScoreRing, faixaDoScore } from "./utils.js";
import { obterMetas, calcularProgressoMeta, calcularProgressoPorCategoria, calcularEconomia, calcularTendencia } from "./goals.js";
import { calcularScore } from "./score.js";
/**
 * Renderiza os KPIs principais do dashboard
 * @param {Object} kpis - { totalMes, totalRegistros, metaMensal, restante, percentualConsumido }
 */
export function renderizarKpis(kpis) {
  const eleKpiTotalMes = qs("#fs-kpi-total-mes");
  const eleKpiMetaMensal = qs("#fs-kpi-meta-mensal");
  const eleKpiRestante = qs("#fs-kpi-restante");
  const eleKpiRegistros = qs("#fs-kpi-total-registros");
  if (eleKpiTotalMes) eleKpiTotalMes.textContent = formatarMoeda(kpis.totalMes || 0);
  if (eleKpiMetaMensal) eleKpiMetaMensal.textContent = formatarMoeda(kpis.metaMensal || 0);
  if (eleKpiRestante) eleKpiRestante.textContent = formatarMoeda(kpis.restante || 0);
  if (eleKpiRegistros) eleKpiRegistros.textContent = kpis.totalRegistros || 0;
}
/**
 * Renderiza a barra de progresso da meta mensal
 * @param {Object} progresso - Resultado de calcularProgressoMeta()
 */
export function renderizarProgressoMeta(progresso) {
  const container = qs("#fs-progresso-meta");
  if (!container) return;
  const percentual = progresso.percentualConsumido;
  const estaOk = progresso.statusVisual === "dentro";
  const estaProximo = progresso.statusVisual === "proximo-do-limite";
  const estaEstourado = progresso.statusVisual === "estourado";
  const barClass = estaEstourado ? "bg-red-500" : estaProximo ? "bg-yellow-500" : "bg-green-500";
  const textColor = estaEstourado ? "text-red-600" : estaProximo ? "text-yellow-600" : "text-green-600";
  container.innerHTML = `
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
      <p style="font-size: 0.85rem; font-weight: 600;">Meta Mensal</p>
      <p style="font-size: 0.78rem; color: var(--fs-text-muted);">${Math.round(percentual)}%</p>
    </div>
    <div style="width: 100%; height: 12px; background: var(--fs-surface-accent); border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
      <div style="width: ${Math.min(100, percentual)}%; height: 100%; background: ${barClass === "bg-green-500" ? "var(--fs-score-bom)" : barClass === "bg-yellow-500" ? "#fbbf24" : "var(--fs-score-critico)"}; transition: width 0.3s ease;"></div>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
      <span style="color: var(--fs-text-muted);">Gasto: ${formatarMoeda(progresso.gasto)}</span>
      <span style="font-weight: 600;">Restante: ${formatarMoeda(progresso.restante)}</span>
    </div>
  `;
}
/**
 * Renderiza o card de economia
 * @param {Object} economia - Resultado de calcularEconomia()
 */
export function renderizarEconomia(economia) {
  const container = qs("#fs-economia-card");
  if (!container) return;
  const percentual = economia.percentualConsumido;
  const atingiu = economia.atingiu;
  container.innerHTML = `
    <div style="text-align: center;">
      <p style="font-size: 0.85rem; font-weight: 600; margin-bottom: 12px;">Economia Realizada</p>
      <p class="fs-mono" style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">${formatarMoeda(economia.economiaRealizada)}</p>
      <p style="font-size: 0.78rem; color: var(--fs-text-muted); margin-bottom: 12px;">de meta: ${formatarMoeda(economia.objetivo)}</p>
      <div style="width: 100%; height: 8px; background: var(--fs-surface-accent); border-radius: 4px; overflow: hidden;">
        <div style="width: ${Math.min(100, percentual)}%; height: 100%; background: ${atingiu ? "var(--fs-score-bom)" : "var(--fs-score-regular)"}; transition: width 0.3s ease;"></div>
      </div>
    </div>
  `;
}
/**
 * Renderiza o Score Financeiro no dashboard
 * @param {number} score - Score de 0 a 100
 */
export function renderizarScore(score) {
  const container = qs("#fs-dashboard-score-ring");
  const descricao = qs("#fs-score-descricao");
  if (!container) return;
  // Atualizar o ring
  pintarScoreRing(container, score);
  // Atualizar descrição baseada na faixa
  if (descricao) {
    const { rotulo } = faixaDoScore(score);
    descricao.textContent = `Seu Score: ${Math.round(score)} · ${rotulo}`;
  }
}
 * @param {Array} progressosPorCategoria - Array de objetos com categoria, gasto, meta, etc
 * @param {Array} categorias - Lista de categorias disponíveis
 */
export function renderizarProgressoPorCategoria(progressosPorCategoria, categorias) {
  const container = qs("#fs-progresso-por-categoria");
  if (!container) return;
  if (progressosPorCategoria.length === 0) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; gap: 10px;">
        <p style="font-size: 0.85rem; color: var(--fs-text-muted); text-align: center;">Nenhuma meta por categoria definida.</p>
      </div>
    `;
    return;
  }
  const getCategoriaInfo = (id) => categorias.find((c) => c.id === id) || { nome: id, icone: "tag" };
  const html = progressosPorCategoria
    .map((prog) => {
      const cat = getCategoriaInfo(prog.categoria);
      const percentual = prog.percentualConsumido;
      const barColor =
        prog.statusVisual === "estourado"
          ? "var(--fs-score-critico)"
          : prog.statusVisual === "proximo-do-limite"
          ? "#fbbf24"
          : "var(--fs-score-bom)";
      return `
        <div style="padding: 12px; border-radius: 8px; background: var(--fs-surface-accent); border-left: 3px solid ${barColor};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <p style="font-size: 0.8rem; font-weight: 600;">${cat.nome}</p>
            <p style="font-size: 0.75rem; color: var(--fs-text-muted);">${Math.round(percentual)}%</p>
          </div>
          <div style="width: 100%; height: 6px; background: var(--fs-surface); border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
            <div style="width: ${Math.min(100, percentual)}%; height: 100%; background: ${barColor}; transition: width 0.3s ease;"></div>
          </div>
          <p style="font-size: 0.7rem; color: var(--fs-text-muted);">${formatarMoeda(prog.gasto)} / ${formatarMoeda(prog.meta)}</p>
        </div>
      `;
    })
    .join("");
  container.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">${html}</div>`;
}
/**
 * Renderiza card de tendência (comparação com mês anterior)
 * @param {Object} tendencia - Resultado de calcularTendencia()
 */
export function renderizarTendencia(tendencia) {
  const container = qs("#fs-tendencia-card");
  if (!container) return;
  if (!tendencia) {
    container.innerHTML = `
      <p style="font-size: 0.85rem; color: var(--fs-text-muted); text-align: center;">Sem dados de mês anterior para comparação.</p>
    `;
    return;
  }
  const cor = tendencia.maiorQueAnterior ? "var(--fs-score-critico)" : "var(--fs-score-bom)";
  const direcao = tendencia.direcao;
  container.innerHTML = `
    <div style="text-align: center;">
      <p style="font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">vs. Mês Anterior</p>
      <p style="font-size: 1.4rem; font-weight: 700; color: ${cor}; margin-bottom: 4px;">
        ${direcao} ${tendencia.percentual}%
      </p>
      <p style="font-size: 0.75rem; color: var(--fs-text-muted);">
        ${tendencia.maiorQueAnterior ? "Gastos aumentaram" : "Gastos diminuíram"} ${formatarMoeda(Math.abs(tendencia.variacao))}
      </p>
    </div>
  `;
}
/**
 * Inicializa o dashboard com dados reais
 * @param {Object} usuarioDoc - Documento do usuário do Firestore
 * @param {Array} despesasMes - Despesas do mês atual
 * @param {Array} despesasMesAnterior - Despesas do mês anterior (opcional)
 * @param {Array} categorias - Lista de categorias disponíveis
 */
export function inicializarDashboard(usuarioDoc, despesasMes, despesasMesAnterior, categorias) {
  const metas = obterMetas(usuarioDoc);
  const totalMes = despesasMes.reduce((sum, d) => sum + (d.valor || 0), 0);
  const totalMesAnterior = despesasMesAnterior ? despesasMesAnterior.reduce((sum, d) => sum + (d.valor || 0), 0) : 0;
  // KPIs
  const kpis = {
    totalMes,
    totalRegistros: despesasMes.length,
    metaMensal: metas.metaMensal,
    restante: Math.max(0, metas.metaMensal - totalMes),
    percentualConsumido: metas.metaMensal > 0 ? (totalMes / metas.metaMensal) * 100 : 0,
  };
  renderizarKpis(kpis);
  // Progresso mensal
  const progresso = calcularProgressoMeta(totalMes, metas.metaMensal);
  renderizarProgressoMeta(progresso);
  // Economia
  const salario = usuarioDoc?.salario || 0;
  const economia = calcularEconomia(salario, totalMes, metas.objetivoEconomia);
  renderizarEconomia(economia);
  // Progresso por categoria
  const progressosPorCategoria = calcularProgressoPorCategoria(despesasMes, metas.metasPorCategoria);
  renderizarProgressoPorCategoria(progressosPorCategoria, categorias);
  // Tendência
  if (despesasMesAnterior && despesasMesAnterior.length > 0) {
    const tendencia = calcularTendencia(totalMes, totalMesAnterior);
    renderizarTendencia(tendencia);
  }
  // Score Financeiro (Stage 4)
  const score = calcularScore({
    totalGastoMes: totalMes,
    metaMensal: metas.metaMensal,
    despesas: despesasMes,
    salario,
    objetivoEconomia: metas.objetivoEconomia,
  });
  renderizarScore(score);
}
export default {
  renderizarKpis,
  renderizarProgressoMeta,
  renderizarEconomia,
  renderizarProgressoPorCategoria,
  renderizarTendencia,
  renderizarScore,
  inicializarDashboard,
};
