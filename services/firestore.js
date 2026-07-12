/**
 * services/firestore.js
 * ---------------------------------------------------------
 * Camada de acesso ao Cloud Firestore. Expõe helpers genéricos
 * de CRUD reutilizados pelos módulos de negócio das próximas
 * etapas (expenses.js, goals.js, score.js, achievements.js),
 * além da função ensureUserDocument, usada pelo authService.
 * ---------------------------------------------------------
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit as fsLimit,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../js/modules/firebase.js";

/**
 * Garante que exista um documento em /users/{uid}. Criado apenas
 * na primeira vez que o usuário loga (login com Google ou cadastro
 * com e-mail/senha).
 * @param {import('firebase/auth').User} user
 * @param {Partial<{nome: string}>} extras
 */
export async function ensureUserDocument(user, extras = {}) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      nome: extras.nome || user.displayName || "",
      email: user.email || "",
      foto: user.photoURL || "",
      salario: null,
      metaMensal: null,
      objetivoEconomia: null,
      tema: "system",
      createdAt: serverTimestamp(),
    });
  }
  return ref;
}

/** Busca um documento único por coleção + id. */
export async function getDocumento(colecao, id) {
  const snap = await getDoc(doc(db, colecao, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Cria/sobrescreve um documento (merge por padrão). */
export function salvarDocumento(colecao, id, dados, merge = true) {
  return setDoc(doc(db, colecao, id), dados, { merge });
}

/** Atualiza campos específicos de um documento existente. */
export function atualizarDocumento(colecao, id, dados) {
  return updateDoc(doc(db, colecao, id), dados);
}

/** Remove um documento. */
export function excluirDocumento(colecao, id) {
  return deleteDoc(doc(db, colecao, id));
}

/**
 * Consulta documentos de uma coleção filtrando sempre por uid
 * (todas as coleções de negócio do FinScore são particionadas
 * por usuário), com ordenação e limite opcionais.
 * @param {string} colecao
 * @param {string} uid
 * @param {{orderByField?: string, orderDirection?: 'asc'|'desc', limitTo?: number}} opcoes
 */
export async function consultarPorUsuario(colecao, uid, opcoes = {}) {
  const restricoes = [where("uid", "==", uid)];

  if (opcoes.orderByField) {
    restricoes.push(orderBy(opcoes.orderByField, opcoes.orderDirection || "desc"));
  }
  if (opcoes.limitTo) {
    restricoes.push(fsLimit(opcoes.limitTo));
  }

  const q = query(collection(db, colecao), ...restricoes);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
