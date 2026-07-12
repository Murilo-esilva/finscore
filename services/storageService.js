/**
 * services/storageService.js
 * ---------------------------------------------------------
 * Camada de acesso ao Firebase Storage. Nesta etapa (1) só
 * preparamos a estrutura — o upload de comprovantes será
 * conectado à UI na etapa de "Cadastro de Gastos".
 * ---------------------------------------------------------
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storage } from "../js/modules/firebase.js";

/**
 * Envia um comprovante para /receipts/{uid}/{expenseId}-{nomeArquivo}
 * e retorna a URL pública de download.
 * @param {string} uid
 * @param {string} expenseId
 * @param {File} arquivo
 */
export async function uploadComprovante(uid, expenseId, arquivo) {
  const caminho = `receipts/${uid}/${expenseId}-${arquivo.name}`;
  const storageRef = ref(storage, caminho);
  await uploadBytes(storageRef, arquivo);
  return getDownloadURL(storageRef);
}

/** Remove um arquivo do Storage a partir do caminho completo. */
export function excluirArquivo(caminho) {
  return deleteObject(ref(storage, caminho));
}
