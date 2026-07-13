/**
 * modules/firebase.js
 * ---------------------------------------------------------
 * Inicializa o Firebase App e expõe as instâncias já prontas
 * (auth, db, storage, googleProvider) para o resto da aplicação.
 * Usa o Firebase SDK Modular v10 direto via CDN (ESM), sem
 * bundler — compatível com GitHub Pages.
 * ---------------------------------------------------------
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { firebaseConfig } from "../../firebase/firebaseConfig.js";
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
// Mantém a sessão ativa entre recarregamentos/abas (requisito do prompt).
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("[firebase] Falha ao configurar persistência de sessão:", error);
});
export default app;
