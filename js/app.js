/**
 * app.js
 * ---------------------------------------------------------
 * Ponto de entrada compartilhado por todas as páginas internas
 * (pages/*.html). Aplica o tema salvo, protege a rota (redireciona
 * para o login se não houver sessão), injeta navbar + sidebar e
 * expõe o usuário autenticado para o script específico da página.
 *
 * Uso em cada página:
 *   import { iniciarPagina } from '../js/app.js';
 *   iniciarPagina('dashboard', (user) => {
 *     // lógica específica do dashboard aqui
 *   });
 * ---------------------------------------------------------
 */
import { exigirAutenticacao } from "./modules/auth.js";
import { renderNavbar } from "../components/navbar.js";
import { renderSidebar } from "../components/sidebar.js";
import { aplicarTema, obterTemaSalvo } from "./modules/utils.js";
// Aplica o tema o quanto antes, para evitar "flash" de tema errado.
aplicarTema(obterTemaSalvo());
// Registrar Service Worker para PWA (Stage 9)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceWorker.js').catch((err) => {
      console.log('Service Worker registration failed:', err);
    });
  });
}
/**
 * @param {string} paginaAtiva - id da página atual: 'dashboard' | 'expenses' | 'reports' | 'profile' | 'settings'
 * @param {(user: import('firebase/auth').User, usuarioDoc?: Object) => void} aoCarregar - chamado após autenticação confirmada e layout montado
 */
export function iniciarPagina(paginaAtiva, aoCarregar) {
  exigirAutenticacao(async (user, usuarioDoc) => {
    renderSidebar(paginaAtiva);
    renderNavbar({
      nome: user.displayName,
      email: user.email,
      foto: user.photoURL,
    });
    document.body.classList.add("fs-authenticated");
    if (typeof aoCarregar === "function") {
      aoCarregar(user, usuarioDoc);
    }
  });
}
