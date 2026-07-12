/**
 * components/toast.js
 * ---------------------------------------------------------
 * Sistema simples de toasts empilháveis. Não depende de UI
 * framework — injeta/anima nós DOM diretamente.
 * Uso: import { showToast } from '../components/toast.js';
 *      showToast('Gasto salvo!', 'success');
 * ---------------------------------------------------------
 */

const ICONES = {
  success: '<i data-lucide="check-circle-2" class="w-5 h-5" style="color:var(--fs-teal)"></i>',
  error: '<i data-lucide="alert-circle" class="w-5 h-5" style="color:var(--fs-rose)"></i>',
  warning: '<i data-lucide="alert-triangle" class="w-5 h-5" style="color:var(--fs-amber)"></i>',
  info: '<i data-lucide="info" class="w-5 h-5" style="color:var(--fs-indigo)"></i>',
};

function obterContainer() {
  let container = document.getElementById("fs-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "fs-toast-container";
    container.setAttribute("aria-live", "polite");
    container.style.cssText =
      "position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;";
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Exibe um toast temporário.
 * @param {string} mensagem
 * @param {'success'|'error'|'warning'|'info'} tipo
 * @param {number} duracaoMs
 */
export function showToast(mensagem, tipo = "info", duracaoMs = 3500) {
  const container = obterContainer();
  const toast = document.createElement("div");
  toast.className = "fs-toast fs-animate-in";
  toast.innerHTML = `${ICONES[tipo] || ICONES.info}<span>${mensagem}</span>`;
  container.appendChild(toast);

  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.transition = "opacity 300ms ease, transform 300ms ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(12px)";
    setTimeout(() => toast.remove(), 300);
  }, duracaoMs);
}
