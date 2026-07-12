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
    .map(() => `<div class="fs-skeleton" style="height:${alturaPx}px;width:100%;margin-bottom:10px;"></div>`)
    .join("");
}
