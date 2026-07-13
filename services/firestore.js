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
  arrayUnion,
  arrayRemove,
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
export async function atualizarDocumento(colecao, id, dados) {
  try {
    const docRef = doc(db, colecao, id);
    // O pulo do gato: setDoc com { merge: true } 
    // Atualiza o que existe e cria o documento caso ele não exista!
    await setDoc(docRef, dados, { merge: true });
    return true;
  } catch (erro) {
    console.error(`Erro ao atualizar documento na coleção ${colecao}:`, erro);
    throw erro;
  }
}

/** Remove um documento. */
export function excluirDocumento(colecao, id) {
  return deleteDoc(doc(db, colecao, id));
}

/** Gera um novo ID de documento (sem gravar nada ainda) para uma coleção. */
export function gerarNovoId(colecao) {
  return doc(collection(db, colecao)).id;
}

/** Adiciona um valor a um campo de array de um documento, sem duplicar. */
export function adicionarAoArray(colecao, id, campo, valor) {
  return updateDoc(doc(db, colecao, id), { [campo]: arrayUnion(valor) });
}

/** Remove um valor de um campo de array de um documento. */
export function removerDoArray(colecao, id, campo, valor) {
  return updateDoc(doc(db, colecao, id), { [campo]: arrayRemove(valor) });
}

/**
 * Consulta documentos de uma coleção filtrando sempre por uid
 * (todas as coleções de negócio do FinScore são particionadas
 * por usuário). Propositalmente NÃO combina `where` com `orderBy`
 * na query — isso exigiria criar um índice composto no console do
 * Firebase antes que a consulta funcionasse. Para o volume de uma
 * conta pessoal, é mais simples trazer os documentos do usuário e
 * ordenar/filtrar/paginar no cliente (feito em modules/expenses.js).
 * Se o volume crescer muito, considere criar o índice composto e
 * voltar a usar `orderByField` aqui.
 * @param {string} colecao
 * @param {string} uid
 * @param {{limitTo?: number}} opcoes
 */
export async function consultarPorUsuario(colecao, uid, opcoes = {}) {
  const restricoes = [where("uid", "==", uid)];

  if (opcoes.limitTo) {
    restricoes.push(fsLimit(opcoes.limitTo));
  }

  const q = query(collection(db, colecao), ...restricoes);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
