/**
 * firebaseConfig.js
 * ---------------------------------------------------------
 * Credenciais do projeto Firebase do FinScore.
 *
 * COMO OBTER:
 * 1. Acesse https://console.firebase.google.com/
 * 2. Crie um projeto (ou selecione um existente).
 * 3. Em "Configurações do projeto" > "Geral" > "Seus apps",
 *    adicione um app Web (</>) e copie o objeto de config.
 * 4. Ative em "Build":
 *    - Authentication → métodos "Google" e "E-mail/senha"
 *    - Firestore Database → modo produção (as regras ficam
 *      em /firebase/firestore.rules)
 *    - Storage
 *
 * NUNCA commite chaves de projetos sensíveis/pagos em repositórios
 * públicos sem revisar as Firestore/Storage Rules antes — a apiKey
 * do Firebase é pública por design, mas quem protege os dados são
 * as Rules, não o segredo da chave.
 * ---------------------------------------------------------
 */

export const firebaseConfig = {
  apiKey: "AIzaSyCsGk7r4OilfhOo1aUtpx1Sk11SpdvhJFg",
  authDomain: "finscore-d677d.firebaseapp.com",
  projectId: "finscore-d677d",
  storageBucket: "finscore-d677d.firebasestorage.app",
  messagingSenderId: "1091598901235",
  appId: "1:1091598901235:web:460099d8bb6b6dfd67fc86",
  measurementId: "G-KH0E4NCG5K"
};
