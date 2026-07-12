/**
 * modules/utils.js
 * ---------------------------------------------------------
 * Funções puras e utilitários de UI compartilhados por toda
 * a aplicação. Sem dependência de Firebase.
 * ---------------------------------------------------------
 */

/** Formata um número como moeda brasileira (R$). */
export function formatarMoeda(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formata uma data (Date | Timestamp do Firestore | string ISO) como dd/mm/aaaa. */
export function formatarData(data) {
  const d = normalizarData(data);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR");
}

/** Formata data e hora como dd/mm/aaaa às HH:mm. */
export function formatarDataHora(data) {
  const d = normalizarData(data);
  if (!d) return "—";
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function normalizarData(data) {
  if (!data) return null;
  if (data instanceof Date) return data;
  if (typeof data.toDate === "function") return data.toDate(); // Firestore Timestamp
  const parsed = new Date(data);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Debounce clássico — usado em busca instantânea e listeners de resize. */
export function debounce(fn, delayMs = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

/** Gera um id curto para uso em listas/otimismo de UI. */
export function gerarId(prefixo = "id") {
  return `${prefixo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Seletor curto. */
export const qs = (sel, escopo = document) => escopo.querySelector(sel);
export const qsa = (sel, escopo = document) => Array.from(escopo.querySelectorAll(sel));

/**
 * Aplica o tema (dark/light/system) ao <html data-theme="...">
 * e persiste a escolha no localStorage.
 * @param {'dark'|'light'|'system'} tema
 */
export function aplicarTema(tema) {
  const prefereEscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const efetivo = tema === "system" ? (prefereEscuro ? "dark" : "light") : tema;
  document.documentElement.setAttribute("data-theme", efetivo);
  localStorage.setItem("fs-theme", tema);
}

/** Lê o tema salvo (padrão: 'system'). */
export function obterTemaSalvo() {
  return localStorage.getItem("fs-theme") || "system";
}

/** Retorna a faixa/cor do Score Financeiro conforme o prompt (0–100). */
export function faixaDoScore(score) {
  if (score >= 90) return { rotulo: "Excelente", cor: "var(--fs-score-excelente)" };
  if (score >= 70) return { rotulo: "Bom", cor: "var(--fs-score-bom)" };
  if (score >= 50) return { rotulo: "Regular", cor: "var(--fs-score-regular)" };
  if (score >= 30) return { rotulo: "Ruim", cor: "var(--fs-score-ruim)" };
  return { rotulo: "Crítico", cor: "var(--fs-score-critico)" };
}

/** Atualiza visualmente um elemento .fs-score-ring com o valor do score. */
export function pintarScoreRing(elemento, score) {
  const valor = Math.max(0, Math.min(100, Number(score) || 0));
  const { cor } = faixaDoScore(valor);
  elemento.style.setProperty("--value", String(valor));
  elemento.style.setProperty("--ring-color", cor);
  const label = elemento.querySelector(".fs-score-ring__value");
  if (label) label.textContent = Math.round(valor);
}
