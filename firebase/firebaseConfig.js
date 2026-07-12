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
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID",
};
