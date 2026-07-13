/**
 * components/loader.js
 * ---------------------------------------------------------
 * Overlay de carregamento global, usado durante operações
 * assíncronas (login, salvar/excluir registros, etc.).
 * ---------------------------------------------------------
 */

function obterOverlay() {
  let overlay = document.getElementById("fs-loader-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "fs-loader-overlay";
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:9998; display:none;
      align-items:center; justify-content:center;
      background:rgba(11,15,29,0.35); backdrop-filter:blur(2px);
    `;
    overlay.innerHTML = `
      <div style="width:44px;height:44px;border-radius:50%;
        border:3px solid rgba(255,255,255,0.35);
        border-top-color:#fff; animation:fs-spin 700ms linear infinite;"></div>
    `;
    document.body.appendChild(overlay);

    const style = document.createElement("style");
    style.textContent = "@keyframes fs-spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(style);
  }
  return overlay;
}

export function mostrarLoader() {
  obterOverlay().style.display = "flex";
}

export function esconderLoader() {
  const overlay = document.getElementById("fs-loader-overlay");
  if (overlay) overlay.style.display = "none";
}

// ALIASES para manter compatibilidade com arquivos que usam inglês (como o settings.html)
export const showLoading = mostrarLoader;
export const hideLoading = esconderLoader;

/**
 * Exibe um balão de notificação (Toast) na tela
 * @param {string} mensagem - Texto a ser exibido
 * @param {string} tipo - 'success' (verde) ou 'error' (vermelho)
 */
export function showMessage(mensagem, tipo = 'success') {
  const toast = document.createElement("div");
  toast.textContent = mensagem;
  
  // Cores: Verde para sucesso, Vermelho para erro
  const bgColor = tipo === 'error' ? 'var(--fs-danger, #ef4444)' : 'var(--fs-success, #10b981)';
  
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${bgColor};
    color: #ffffff;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  
  document.body.appendChild(toast);

  // Animação de entrada
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  // Remove o toast após 3.5 segundos
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 300); // Aguarda a animação de saída terminar
  }, 3500);
}

/**
 * Envolve uma promise, exibindo o loader durante sua execução.
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<T>}
 */
export async function comLoader(promise) {
  mostrarLoader();
  try {
    return await promise;
  } finally {
    esconderLoader();
  }
}

/** Gera o markup de N linhas de skeleton (usado em listas/tabelas). */
export function skeletonLinhas(qtd = 3, alturaPx = 56) {
  return Array.from({ length: qtd })
    .map(() => `<div class="fs-skeleton" style="height:${alturaPx}px;width:100%;margin-bottom:10px;border-radius:8px;"></div>`)
    .join("");
}
