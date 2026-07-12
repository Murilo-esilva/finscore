/**
 * services/authService.js
 * ---------------------------------------------------------
 * Camada de acesso ao Firebase Authentication. Não conhece
 * a UI — apenas expõe funções puras para login, cadastro,
 * logout e observação do estado de autenticação. A orquestração
 * com a interface (formulários, toasts, redirecionamentos)
 * fica em modules/auth.js.
 * ---------------------------------------------------------
 */

import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth, googleProvider } from "../js/modules/firebase.js";
import { ensureUserDocument } from "./firestore.js";

/**
 * Autentica com Google via popup e garante o documento do
 * usuário em /users/{uid}.
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function loginComGoogle() {
  const { user } = await signInWithPopup(auth, googleProvider);
  await ensureUserDocument(user);
  return user;
}

/**
 * Autentica com e-mail e senha.
 * @param {string} email
 * @param {string} senha
 */
export async function loginComEmailSenha(email, senha) {
  const { user } = await signInWithEmailAndPassword(auth, email, senha);
  await ensureUserDocument(user);
  return user;
}

/**
 * Cria uma nova conta com e-mail/senha, define o nome de
 * exibição e cria o documento inicial em /users/{uid}.
 * @param {string} nome
 * @param {string} email
 * @param {string} senha
 */
export async function cadastrarComEmailSenha(nome, email, senha) {
  const { user } = await createUserWithEmailAndPassword(auth, email, senha);
  if (nome) {
    await updateProfile(user, { displayName: nome });
  }
  await ensureUserDocument(user, { nome });
  return user;
}

/**
 * Envia e-mail de redefinição de senha.
 * @param {string} email
 */
export function enviarResetSenha(email) {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Encerra a sessão do usuário atual.
 */
export function logout() {
  return signOut(auth);
}

/**
 * Observa mudanças no estado de autenticação.
 * @param {(user: import('firebase/auth').User | null) => void} callback
 * @returns {() => void} função para cancelar a observação
 */
export function observarAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Mapeia códigos de erro do Firebase Auth para mensagens em
 * português, amigáveis para exibir em toasts/formulários.
 * @param {string} code
 */
export function mensagemDeErroAuth(code) {
  const mensagens = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-disabled": "Esta conta foi desativada.",
    "auth/user-not-found": "Nenhuma conta encontrada com este e-mail.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/popup-closed-by-user": "Login cancelado.",
    "auth/network-request-failed": "Falha de conexão. Verifique sua internet.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente em instantes.",
  };
  return mensagens[code] || "Não foi possível concluir a operação. Tente novamente.";
}
