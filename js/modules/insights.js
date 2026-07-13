/**
 * modules/insights.js
 * ---------------------------------------------------------
 * ETAPA 6: Insights Inteligentes
 * Análises automáticas determinísticas sobre os gastos
 * - Comparação categoria vs mês anterior
 * - Projeção de estouro de meta
 * - Comparação de economia mês a mês
 * Preparado para evolução futura com IA (Claude/OpenAI)
 * ---------------------------------------------------------
 */
/**
 * Gera insights sobre os gastos do usuário
 * @param {Object} params - { totalMes, totalMesAnterior, metaMensal, despesas, despesasAnterior, diaMes }
 * @returns {Array} Array de insights com { tipo, titulo, descricao, cor, icone }
 */
export function gerarInsights(params) {
  const {
    totalMes = 0,
    totalMesAnterior = 0,
    metaMensal = 0,
    despesas = [],
    despesasAnterior = [],
    diaMes = new Date().getDate(),
    diasTotaisMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
  } = params;
  const insights = [];
  // Insight 1: Variação de gastos em relação ao mês anterior
  if (totalMesAnterior > 0) {
    const variacao = totalMes - totalMesAnterior;
    const percentualVariacao = (variacao / totalMesAnterior) * 100;
    if (variacao > totalMesAnterior * 0.15) {
      insights.push({
        tipo: "alerta",
        titulo: "⚠️ Gastos aumentaram",
        descricao: `Você gastou ${formatarPercentual(percentualVariacao)}% mais neste mês comparado ao anterior.`,
        cor: "#f59e0b",
        icone: "trending-up",
      });
    } else if (variacao < -totalMesAnterior * 0.15) {
      insights.push({
        tipo: "positivo",
        titulo: "✨ Gastos reduziram",
        descricao: `Você gastou ${formatarPercentual(Math.abs(percentualVariacao))}% menos neste mês comparado ao anterior.`,
        cor: "#10b981",
        icone: "trending-down",
      });
    }
  }
  // Insight 2: Projeção de estouro de meta
  if (metaMensal > 0) {
    const diasDecorridos = diaMes;
    const gastoPorDia = diasDecorridos > 0 ? totalMes / diasDecorridos : 0;
    const projecaoFinal = gastoPorDia * diasTotaisMes;
    const excesso = projecaoFinal - metaMensal;
    if (excesso > metaMensal * 0.1) {
      insights.push({
        tipo: "alerta",
        titulo: "📊 Possível estouro de meta",
        descricao: `Se continuar neste ritmo, você ultrapassará sua meta em aproximadamente R$ ${formatarMoeda(excesso)}.`,
        cor: "#ef4444",
        icone: "alert-triangle",
      });
    } else if (excesso < 0 && excesso > metaMensal * -0.2) {
      insights.push({
        tipo: "neutro",
        titulo: "📈 Meta ajustada",
        descricao: `Ao ritmo atual, você atingirá R$ ${formatarMoeda(projecaoFinal)}, ficando dentro da meta.`,
        cor: "#8b5cf6",
        icone: "info",
      });
    }
  }
  // Insight 3: Categoria com maior crescimento
  const crescimentoPorCategoria = calcularCrescimentoPorCategoria(despesas, despesasAnterior);
  const categoriaComMaiorCrescimento = Object.entries(crescimentoPorCategoria)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 1);
  if (categoriaComMaiorCrescimento.length > 0) {
    const [categoria, crescimento] = categoriaComMaiorCrescimento[0];
    if (crescimento > 20) {
      insights.push({
        tipo: "alerta",
        titulo: `🍔 ${categoria} em alta`,
        descricao: `Seus gastos em ${categoria} aumentaram ${formatarPercentual(crescimento)}% em relação ao mês anterior.`,
        cor: "#f59e0b",
        icone: "alert-circle",
      });
    }
  }
  // Insight 4: Economia realizada
  if (despesasAnterior && despesasAnterior.length > 0) {
    const totalMesAnteriorCalculado = despesasAnterior.reduce((sum, d) => sum + (d.valor || 0), 0);
    const economiaAtual = Math.max(0, 5000 - totalMes); // Suponhamos salário de 5000 (será dinâmico)
    const economiaAnterior = Math.max(0, 5000 - totalMesAnteriorCalculado);
    const variacaoEconomia = economiaAtual - economiaAnterior;
    if (variacaoEconomia > economiaAnterior * 0.1) {
      insights.push({
        tipo: "positivo",
        titulo: "💰 Economia melhorou",
        descricao: `Você poupou R$ ${formatarMoeda(variacaoEconomia)} a mais neste mês.`,
        cor: "#10b981",
        icone: "dollar-sign",
      });
    }
  }
  // Insight 5: Padrão de gastos (se há consistência)
  const diasComGastos = new Set(despesas.map((d) => new Date(d.dataHora).toDateString())).size;
  const mediaRegistrosPorDia = despesas.length / Math.max(1, diasComGastos);
  if (mediaRegistrosPorDia > 3) {
    insights.push({
      tipo: "positivo",
      titulo: "📝 Ótima regularidade",
      descricao: `Você está registrando seus gastos consistentemente (${mediaRegistrosPorDia.toFixed(1)} transações por dia).`,
      cor: "#06b6d4",
      icone: "check-circle",
    });
  } else if (diasComGastos < diasTotaisMes / 2) {
    insights.push({
      tipo: "neutro",
      titulo: "📋 Aumente os registros",
      descricao: `Registre seus gastos mais frequentemente para ter uma análise mais precisa.`,
      cor: "#6366f1",
      icone: "info",
    });
  }
  return insights;
}
/**
 * Calcula o crescimento por categoria em relação ao mês anterior
 */
function calcularCrescimentoPorCategoria(despesasAtual, despesasAnterior) {
  const porCategoriaAtual = agruparPorCategoria(despesasAtual);
  const porCategoriaAnterior = agruparPorCategoria(despesasAnterior);
  const crescimento = {};
  Object.keys(porCategoriaAtual).forEach((cat) => {
    const atual = porCategoriaAtual[cat] || 0;
    const anterior = porCategoriaAnterior[cat] || 1;
    crescimento[cat] = ((atual - anterior) / anterior) * 100;
  });
  return crescimento;
}
/**
 * Agrupa despesas por categoria
 */
function agruparPorCategoria(despesas) {
  const resultado = {};
  despesas.forEach((d) => {
    const cat = d.categoria || "Outro";
    resultado[cat] = (resultado[cat] || 0) + (d.valor || 0);
  });
  return resultado;
}
/**
 * Renderiza insights no dashboard
 * @param {Array} insights - Array de insights
 * @param {string} containerId - ID do container
 */
export function renderizarInsights(insights, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (insights.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--fs-text-muted);">
        <p style="font-size: 0.85rem;">Registre mais gastos para gerar insights personalizados.</p>
      </div>
    `;
    return;
  }
  const html = insights
    .map(
      (insight) => `
      <div style="padding: 16px; border-radius: 8px; background: var(--fs-surface-accent); margin-bottom: 12px; border-left: 4px solid ${insight.cor};">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="font-size: 1.2rem; flex-shrink: 0;">${insight.titulo.split(" ")[0]}</div>
          <div style="flex: 1; min-width: 0;">
            <p style="font-size: 0.85rem; font-weight: 600; margin: 0 0 4px 0;">${insight.titulo.split(" ").slice(1).join(" ")}</p>
            <p style="font-size: 0.78rem; color: var(--fs-text-muted); margin: 0;">${insight.descricao}</p>
          </div>
        </div>
      </div>
    `
    )
    .join("");
  container.innerHTML = html;
}
/**
 * Formata um número como percentual
 */
function formatarPercentual(valor) {
  return Math.abs(valor).toFixed(1);
}
/**
 * Formata um número como moeda
 */
function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}
export default {
  gerarInsights,
  renderizarInsights,
};
