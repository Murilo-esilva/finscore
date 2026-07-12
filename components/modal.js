/**
 * components/modal.js
 * ---------------------------------------------------------
 * Modal genérico e reutilizável. Usado em etapas futuras para
 * formulários (novo gasto, nova meta) e confirmações (excluir
 * registro), conforme exigido no prompt ("Confirmação antes de
 * excluir registros").
 * ---------------------------------------------------------
 */

let modalAtual = null;

/**
 * Abre um modal com conteúdo HTML customizado.
 * @param {{titulo: string, conteudoHTML: string, aoFechar?: () => void}} opcoes
 * @returns {{fechar: () => void, elemento: HTMLElement}}
 */
export function abrirModal({ titulo, conteudoHTML, aoFechar }) {
  fecharModal();

  const backdrop = document.createElement("div");
  backdrop.className = "fs-modal-backdrop";
  backdrop.style.cssText = `
    position:fixed; inset:0; z-index:9997; display:flex;
    align-items:center; justify-content:center; padding:16px;
    background:rgba(11,15,29,0.45);
  `;

  backdrop.innerHTML = `
    <div class="fs-glass fs-animate-in" role="dialog" aria-modal="true" aria-label="${titulo}"
      style="width:100%; max-width:460px; border-radius:var(--fs-radius-lg);
      box-shadow:var(--fs-shadow-lg); padding:24px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <h3 class="fs-display" style="font-size:1.1rem; font-weight:600;">${titulo}</h3>
        <button data-fs-modal-close class="fs-btn fs-btn-ghost" style="padding:6px;" aria-label="Fechar">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
      <div>${conteudoHTML}</div>
    </div>
  `;

  document.body.appendChild(backdrop);
  if (window.lucide) window.lucide.createIcons();

  const fechar = () => {
    backdrop.remove();
    document.removeEventListener("keydown", aoTeclaEsc);
    if (aoFechar) aoFechar();
    modalAtual = null;
  };

  function aoTeclaEsc(e) {
    if (e.key === "Escape") fechar();
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) fechar();
  });
  backdrop.querySelector("[data-fs-modal-close]").addEventListener("click", fechar);
  document.addEventListener("keydown", aoTeclaEsc);

  modalAtual = { fechar, elemento: backdrop };
  return modalAtual;
}

export function fecharModal() {
  if (modalAtual) modalAtual.fechar();
}

/**
 * Modal de confirmação (ex.: excluir um gasto).
 * @param {{titulo?: string, mensagem: string, textoConfirmar?: string}} opcoes
 * @returns {Promise<boolean>}
 */
export function confirmar({ titulo = "Confirmar ação", mensagem, textoConfirmar = "Confirmar" }) {
  return new Promise((resolve) => {
    const { fechar, elemento } = abrirModal({
      titulo,
      conteudoHTML: `
        <p style="color:var(--fs-text-muted); font-size:0.9rem; margin-bottom:20px;">${mensagem}</p>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button data-fs-cancel class="fs-btn fs-btn-secondary">Cancelar</button>
          <button data-fs-confirm class="fs-btn fs-btn-primary" style="background:var(--fs-rose);">${textoConfirmar}</button>
        </div>
      `,
      aoFechar: () => resolve(false),
    });

    elemento.querySelector("[data-fs-cancel]").addEventListener("click", fechar);
    elemento.querySelector("[data-fs-confirm]").addEventListener("click", () => {
      resolve(true);
      fechar();
    });
  });
}
