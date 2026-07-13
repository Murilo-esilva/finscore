/**
 * components/sidebar.js
 * ---------------------------------------------------------
 * Renderiza a navegação lateral. Recolhe para ícones em telas
 * menores/estado colapsado, e vira uma gaveta (drawer) no mobile.
 * ---------------------------------------------------------
 */

const ITENS_NAV = [
  { pagina: "dashboard", rotulo: "Dashboard", icone: "layout-dashboard", href: "dashboard.html" },
  { pagina: "expenses", rotulo: "Gastos", icone: "wallet", href: "expenses.html" },
  { pagina: "reports", rotulo: "Relatórios", icone: "bar-chart-3", href: "reports.html" },
  { pagina: "profile", rotulo: "Perfil", icone: "user-circle", href: "profile.html" },
  { pagina: "settings", rotulo: "Configurações", icone: "settings", href: "settings.html" },
];

/**
 * @param {string} paginaAtiva - id da página atual (ex: 'dashboard')
 */
export function renderSidebar(paginaAtiva) {
  const raiz = document.getElementById("sidebar-root");
  if (!raiz) return;

  const itensHTML = ITENS_NAV.map((item) => {
    const ativo = item.pagina === paginaAtiva;
    return `
      <a href="${item.href}"
        class="fs-nav-item"
        data-ativo="${ativo}"
        style="
          display:flex; align-items:center; gap:12px; padding:10px 14px;
          border-radius:var(--fs-radius-sm); font-size:0.9rem; font-weight:500;
          color:${ativo ? "#fff" : "var(--fs-text-muted)"};
          background:${ativo ? "var(--fs-gradient)" : "transparent"};
          transition: background var(--fs-transition-fast), color var(--fs-transition-fast);
        ">
        <i data-lucide="${item.icone}" class="w-[18px] h-[18px] shrink-0"></i>
        <span class="fs-nav-label">${item.rotulo}</span>
      </a>
    `;
  }).join("");

  raiz.innerHTML = `
    <aside id="fs-sidebar" class="fs-surface"
      style="
        position:fixed; top:0; left:0; bottom:0; width:var(--fs-sidebar-w); z-index:40;
        display:flex; flex-direction:column; padding:20px 14px; border-radius:0;
        border-right:1px solid var(--fs-border); border-top:none; border-bottom:none; border-left:none;
        transition: transform var(--fs-transition-base), width var(--fs-transition-base);
      ">
      <div style="display:flex; align-items:center; gap:10px; padding:8px 10px 24px;">
        <div style="width:32px;height:32px;border-radius:10px;background:var(--fs-gradient);
          display:grid; place-items:center; flex-shrink:0;">
          <i data-lucide="activity" class="w-[18px] h-[18px]" style="color:white;"></i>
        </div>
        <span class="fs-display fs-nav-label" style="font-weight:700; font-size:1.05rem;">FinScore</span>
      </div>

      <nav style="display:flex; flex-direction:column; gap:4px; flex:1;">
        ${itensHTML}
      </nav>

      <button id="fs-sidebar-toggle" class="fs-btn fs-btn-ghost" style="align-self:flex-start; display:none;">
        <i data-lucide="panel-left" class="w-4 h-4"></i>
      </button>
    </aside>

    <!-- Overlay para fechar a sidebar no mobile -->
    <div id="fs-sidebar-overlay" style="
      position:fixed; inset:0; background:rgba(11,15,29,0.4); z-index:39;
      display:none; opacity:0; transition:opacity var(--fs-transition-base);
    "></div>
  `;

  // Renderiza os ícones internos do componente imediatamente
  if (window.lucide) window.lucide.createIcons();

  const sidebar = document.getElementById("fs-sidebar");
  const overlay = document.getElementById("fs-sidebar-overlay");

  if (!sidebar || !overlay) return;

  function aplicarEstadoMobile() {
    const isMobile = window.innerWidth < 1024;
    const aberto = document.body.classList.contains("fs-sidebar-open");

    if (isMobile) {
      sidebar.style.transform = aberto ? "translateX(0)" : "translateX(-100%)";
      overlay.style.display = aberto ? "block" : "none";
      
      // Pequeno micro-delay para permitir que a transição CSS de opacidade ocorra
      setTimeout(() => {
        overlay.style.opacity = aberto ? "1" : "0";
      }, 10);
    } else {
      // No Desktop garante que ela fique sempre visível e limpa estados residuais do mobile
      sidebar.style.transform = "translateX(0)";
      overlay.style.display = "none";
      overlay.style.opacity = "0";
      document.body.classList.remove("fs-sidebar-open");
    }
  }

  overlay.addEventListener("click", () => {
    document.body.classList.remove("fs-sidebar-open");
    aplicarEstadoMobile();
  });

  window.addEventListener("resize", aplicarEstadoMobile);
  
  // Executa após estabilização do DOM para evitar problemas de largura no primeiro load
  setTimeout(aplicarEstadoMobile, 50);

  return { aplicarEstadoMobile };
}

/** Alterna a sidebar aberta/fechada (usado pelo botão hambúrguer da navbar). */
export function alternarSidebarMobile() {
  document.body.classList.toggle("fs-sidebar-open");
  const sidebar = document.getElementById("fs-sidebar");
  const overlay = document.getElementById("fs-sidebar-overlay");
  const aberto = document.body.classList.contains("fs-sidebar-open");
  
  if (sidebar) sidebar.style.transform = aberto ? "translateX(0)" : "translateX(-100%)";
  if (overlay) {
    if (aberto) {
      overlay.style.display = "block";
      setTimeout(() => { overlay.style.opacity = "1"; }, 10);
    } else {
      overlay.style.opacity = "0";
      setTimeout(() => { overlay.style.display = "none"; }, 200); // tempo casado com a transição base
    }
  }
}
