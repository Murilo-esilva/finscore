/**
 * modules/auth.js
 * ---------------------------------------------------------
 * Controlador da tela de autenticação (index.html). Liga os
 * formulários de login/cadastro ao authService, trata erros
 * e redireciona para o dashboard após sucesso.
 *
 * Também expõe `exigirAutenticacao()`, usada no topo de todas
 * as páginas internas (pages/*.html) para bloquear o acesso
 * de quem não está logado.
 * ---------------------------------------------------------
 */
import {
  loginComGoogle,
  loginComEmailSenha,
  cadastrarComEmailSenha,
  enviarResetSenha,
  observarAuth,
  mensagemDeErroAuth,
} from "../../services/authService.js";
import { showToast } from "../../components/toast.js";
import { comLoader } from "../../components/loader.js";
import { qs } from "./utils.js";

/**
 * Protege páginas internas: redireciona para o login se não
 * houver usuário autenticado.
 * @param {(user: import('firebase/auth').User) => void} aoAutenticar
 */
export function exigirAutenticacao(aoAutenticar) {
  observarAuth((user) => {
    if (!user) {
      window.location.href = "../index.html";
      return;
    }
    aoAutenticar(user);
  });
}

/**
 * Inicializa a página de login/cadastro (index.html).
 */
export function inicializarPaginaDeLogin() {
  // Se já existir uma sessão ativa, o próprio observador redireciona
  observarAuth((user) => {
    if (user) {
      window.location.href = "pages/dashboard.html";
    }
  });

  let modoCadastro = false;
  const form = qs("#fs-auth-form");
  const nomeWrapper = qs("#fs-campo-nome");
  const tituloForm = qs("#fs-auth-titulo");
  const subtituloForm = qs("#fs-auth-subtitulo");
  const botaoSubmit = qs("#fs-auth-submit");
  const linkAlternar = qs("#fs-auth-alternar");
  const linkEsqueciSenha = qs("#fs-esqueci-senha");
  const botaoGoogle = qs("#fs-btn-google");

  function atualizarModo() {
    nomeWrapper.style.display = modoCadastro ? "block" : "none";
    tituloForm.textContent = modoCadastro ? "Crie sua conta" : "Bem-vindo de volta";
    subtituloForm.textContent = modoCadastro
      ? "Comece a construir seu Score Financeiro."
      : "Acesse seu painel de controle financeiro.";
    botaoSubmit.textContent = modoCadastro ? "Criar conta" : "Entrar";
    linkAlternar.textContent = modoCadastro
      ? "Já tem uma conta? Entrar"
      : "Ainda não tem conta? Cadastre-se";
  }

  linkAlternar?.addEventListener("click", (e) => {
    e.preventDefault();
    modoCadastro = !modoCadastro;
    atualizarModo();
  });

  linkEsqueciSenha?.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = qs("#fs-input-email")?.value?.trim();
    if (!email) {
      showToast("Digite seu e-mail para receber o link de redefinição.", "warning");
      return;
    }
    try {
      await comLoader(enviarResetSenha(email));
      showToast("Enviamos um link de redefinição para seu e-mail.", "success");
    } catch (err) {
      showToast(mensagemDeErroAuth(err.code), "error");
    }
  });

  botaoGoogle?.addEventListener("click", async () => {
    try {
      await comLoader(loginComGoogle());
      // O redirecionamento acontece automaticamente pelo observarAuth no topo
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        showToast(mensagemDeErroAuth(err.code), "error");
      }
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = qs("#fs-input-nome")?.value?.trim();
    const email = qs("#fs-input-email")?.value?.trim();
    const senha = qs("#fs-input-senha")?.value;

    try {
      if (modoCadastro) {
        await comLoader(cadastrarComEmailSenha(nome, email, senha));
        showToast("Conta criada com sucesso!", "success");
      } else {
        await comLoader(loginComEmailSenha(email, senha));
      }
      // O redirecionamento acontece automaticamente pelo observarAuth no topo
    } catch (err) {
      showToast(mensagemDeErroAuth(err.code), "error");
    }
  });

  atualizarModo();
}

