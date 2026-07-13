export const CATALOGO_CONQUISTAS = [
  {
    id: "primeiro-gasto",
    titulo: "Primeiro Passo",
    descricao: "Registre seu primeiro gasto",
    icone: "🎯",
    cor: "#6366f1",
    criterio: (dados) => dados.totalRegistros >= 1,
  },
  {
    id: "primeira-semana",
    titulo: "Semana Ativa",
    descricao: "Registre gastos por 7 dias consecutivos",
    icone: "📅",
    cor: "#8b5cf6",
    criterio: (dados) => dados.diasComRegistrosConsecutivos >= 7,
  },
  {
    id: "30-dias",
    titulo: "Mês Produtivo",
    descricao: "Registre gastos durante 30 dias",
    icone: "🏆",
    cor: "#d946ef",
    criterio: (dados) => dados.diasComRegistrosTotal >= 30,
  },
  {
    id: "100-registros",
    titulo: "Centésimo Registro",
    descricao: "Acumule 100 registros de gastos",
    icone: "💯",
    cor: "#ec4899",
    criterio: (dados) => dados.totalRegistros >= 100,
  },
  {
    id: "meta-atingida",
    titulo: "Meta Cumprida",
    descricao: "Fique dentro da meta mensal",
    icone: "✅",
    cor: "#10b981",
    criterio: (dados) => dados.metaAtingida,
  },
  {
    id: "meta-superada",
    titulo: "Economista",
    descricao: "Economize 20% a mais que a meta",
    icone: "💰",
    cor: "#059669",
    criterio: (dados) => dados.economizouAlem,
  },
  {
    id: "primeiro-mes-positivo",
    titulo: "Primeiro Mês Positivo",
    descricao: "Termine o mês com saldo positivo",
    icone: "📈",
    cor: "#0d9488",
    criterio: (dados) => dados.saldoPositivo,
  },
  {
    id: "score-90",
    titulo: "Financeiro Excelente",
    descricao: "Atinja um score acima de 90",
    icone: "⭐",
    cor: "#fbbf24",
    criterio: (dados) => dados.scoreAtual >= 90,
  },
  {
    id: "score-70",
    titulo: "Financeiro Bom",
    descricao: "Atinja um score acima de 70",
    icone: "🌟",
    cor: "#f59e0b",
    criterio: (dados) => dados.scoreAtual >= 70,
  },
  {
    id: "distribuicao-saudavel",
    titulo: "Distribuição Equilibrada",
    descricao: "Distribua seus gastos entre 5+ categorias",
    icone: "🎨",
    cor: "#06b6d4",
    criterio: (dados) => dados.categoriasDistintas >= 5,
  },
];
/**
 * Verifica quais conquistas foram desbloqueadas
 * @param {Object} dados - { totalRegistros, score, metaAtingida, etc }
 * @returns {Array} IDs das conquistas desbloqueadas
 */
export function verificarConquisitas(dados) {
  const desbloqueadas = [];
  CATALOGO_CONQUISTAS.forEach((conquista) => {
    if (conquista.criterio(dados)) {
      desbloqueadas.push(conquista.id);
    }
  });
  return desbloqueadas;
}
/**
 * Obtém informações de uma conquista
 */
export function obterConquista(id) {
  return CATALOGO_CONQUISTAS.find((c) => c.id === id);
}
/**
 * Renderiza o mural de conquistas
 * @param {Array} conquistasDesbloqueadas - IDs das conquistas desbloqueadas
 * @param {string} containerId - ID do container
 */
export function renderizarMuralConquisitas(conquistasDesbloqueadas, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const html = CATALOGO_CONQUISTAS.map((conquista) => {
    const desbloqueada = conquistasDesbloqueadas.includes(conquista.id);
    const classeOpacidade = desbloqueada ? "" : "opacity-50";
    const classeBorda = desbloqueada ? `border-l-4` : "";
    return `
      <div style="
        padding: 16px;
        border-radius: 8px;
        background: var(--fs-surface-accent);
        margin-bottom: 12px;
        border-left: 4px solid ${conquista.cor};
        opacity: ${desbloqueada ? 1 : 0.6};
        transition: all 0.3s ease;
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 1.8rem; flex-shrink: 0;">${conquista.icone}</div>
          <div style="flex: 1; min-width: 0;">
            <p style="font-size: 0.85rem; font-weight: 600; margin: 0 0 4px 0;">${conquista.titulo}</p>
            <p style="font-size: 0.78rem; color: var(--fs-text-muted); margin: 0;">${conquista.descricao}</p>
          </div>
          ${desbloqueada ? '<p style="font-size: 0.85rem; font-weight: 700; color: ' + conquista.cor + '; margin: 0;">✓ Desbloqueada</p>' : '<p style="font-size: 0.75rem; color: var(--fs-text-muted); margin: 0;">🔒 Bloqueada</p>'}
        </div>
      </div>
    `;
  }).join("");
  container.innerHTML = html;
}
/**
 * Mostra um toast de celebração ao desbloquear conquista
 * @param {string} conquistaId - ID da conquista
 */
export function mostrarToastConquista(conquistaId) {
  const conquista = obterConquista(conquistaId);
  if (!conquista) return;
  // Usar o sistema de toast existente na aplicação
  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${conquista.cor};
    color: white;
    padding: 20px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.95rem;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 1.5rem;">${conquista.icone}</span>
      <div>
        <p style="margin: 0; font-weight: 700;">Conquista Desbloqueada!</p>
        <p style="margin: 4px 0 0 0; font-size: 0.85rem; opacity: 0.9;">${conquista.titulo}</p>
      </div>
    </div>
  `;
  document.body.appendChild(toast);
  // Remover após 4 segundos
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
export default {
  CATALOGO_CONQUISTAS,
  verificarConquisitas,
  obterConquista,
  renderizarMuralConquisitas,
  mostrarToastConquista,
};
