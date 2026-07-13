/**
 * components/navbar.js
 * ---------------------------------------------------------
 * Renderiza a barra superior: botão de menu (mobile), busca
 * instantânea (placeholder pronto para próximas etapas), toggle
 * de tema e menu do usuário (com logout).
 * ---------------------------------------------------------
 */
import { aplicarTema, obterTemaSalvo } from "../js/modules/utils.js";
import { alternarSidebarMobile } from "./sidebar.js";
import { logout } from "../services/authService.js";
import { showToast } from "./toast.js";

/**
 * @param {{nome: string, email: string, foto?: string}} usuario
 */
export function renderNavbar(usuario) {
  const raiz = document.getElementById("navbar-root");
  if (!raiz) return;

  const iniciais = (usuario?.nome || usuario?.email || "?").trim().charAt(0).toUpperCase();
  const temaAtual = obterTemaSalvo();

  // Mapeamento dinâmico de ícones para o Lucide
  const obterIconeTema = (tema) => {
    if (tema === "dark") return "moon";
    if (tema === "light") return "sun";
    return "monitor";
  };

  raiz.innerHTML = `
    <header class="fs-glass" style="
      position:sticky; top:0; z-index:30; height:var(--fs-topbar-h);
      display:flex; align-items:center; justify-content:space-between;
      padding:0 20px; border-bottom:1px solid var(--fs-border);
    ">
      <div style="display:flex; align-items:center; gap:14px; flex:1; min-width:0;">
        <button id="fs-menu-btn" class="fs-btn fs-btn-ghost" style="padding:8px; display:none;" aria-label="Abrir menu">
          <i data-lucide="menu" class="w-5 h-5"></i>
        </button>

        <div style="position:relative; max-width:360px; width:100%;">
          <i data-lucide="search" class="w-4 h-4" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--fs-text-muted);"></i>
          <input id="fs-search-input" class="fs-input" style="padding-left:36px;" placeholder="Buscar gastos, categorias..." />
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:8px;">
        <button id="fs-theme-toggle" class="fs-btn fs-btn-ghost" style="padding:8px;" aria-label="Alternar tema" title="Alternar tema">
          <i id="fs-theme-icon" data-lucide="${obterIconeTema(temaAtual)}" class="w-[18px] h-[18px]"></i>
        </button>

        <div style="position:relative;">
          <button id="fs-user-menu-btn" class="fs-btn fs-btn-ghost" style="padding:4px; gap:8px;">
            ${
              usuario?.foto
                ? `<img src="${usuario.foto}" alt="${usuario.nome || ""}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />`
                : `<div style="width:32px;height:32px;border-radius:50%;background:var(--fs-gradient);color:#fff;display:grid;place-items:center;font-weight:600;font-size:0.85rem;">${iniciais}</div>`
            }
            <i data-lucide="chevron-down" class="w-4 h-4" style="color:var(--fs-text-muted);"></i>
          </button>

          <div id="fs-user-menu" class="fs-surface fs-animate-in" style="
            display:none; position:absolute; right:0; top:calc(100% + 8px); width:220px;
            padding:8px; z-index:50;
          ">
            <div style="padding:8px 10px 10px; border-bottom:1px solid var(--fs-border); margin-bottom:6px;">
              <p style="font-weight:600; font-size:0.85rem;">${usuario?.nome || "Usuário"}</p>
              <p style="font-size:0.75rem; color:var(--fs-text-muted);">${usuario?.email || ""}</p>
            </div>
            <a href="profile.html" class="fs-btn fs-btn-ghost" style="width:100%; justify-content:flex-start;">
              <i data-lucide="user-circle" class="w-4 h-4"></i> Perfil
            </a>
            <a href="settings.html" class="fs-btn fs-btn-ghost" style="width:100%; justify-content:flex-start;">
              <i data-lucide="settings" class="w-4 h-4"></i> Configurações
            </a>
            <button id="fs-logout-btn" class="fs-btn fs-btn-ghost" style="width:100%; justify-content:flex-start; color:var(--fs-rose);">
              <i data-lucide="log-out" class="w-4 h-4"></i> Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  `;

  // Inicializa os ícones imediatamente após montar o HTML
  if (window.lucide) window.lucide.createIcons();

  // Controle da Sidebar Mobile
  const menuBtnMobile = document.getElementById("fs-menu-btn");
  if (menuBtnMobile) {
    menuBtnMobile.addEventListener("click", alternarSidebarMobile);
  }

  // Controle do Menu de Usuário (Dropdown)
  const menuBtn = document.getElementById("fs-user-menu-btn");
  const menu = document.getElementById("fs-user-menu");
  
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", (e) => {
      if (!menuBtn.contains(e.target) && !menu.contains(e.target)) {
        menu.style.display = "none";
      }
    });
  }

  // Alternador de Tema Inteligente (sem re-renderizar a barra toda)
  const themeToggle = document.getElementById("fs-theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const atual = obterTemaSalvo();
      const proximo = atual === "light" ? "dark" : atual === "dark" ? "system" : "light";
      
      aplicarTema(proximo);

      // Atualiza cirurgicamente apenas o ícone do tema
      const iconeTema = document.getElementById("fs-theme-icon");
      if (iconeTema) {
        iconeTema.setAttribute("data-lucide", obterIconeTema(proximo));
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Botão de Logout
  const logoutBtn = document.getElementById("fs-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await logout();
        window.location.href = "../index.html";
      } catch (err) {
        console.error(err);
        showToast("Não foi possível sair. Tente novamente.", "error");
      }
    });
  }

  // Gerenciador responsivo estável para o botão hambúrguer
  function ajustarBotaoMenu() {
    const btn = document.getElementById("fs-menu-btn");
    if (btn) {
      btn.style.display = window.innerWidth < 1024 ? "inline-flex" : "none";
    }
  }
  
  window.addEventListener("resize", ajustarBotaoMenu);
  ajustarBotaoMenu(); // Execução imediata segura
}
