/**
 * Configuração pública do Supabase.
 *
 * Em GitHub Pages não existe .env em runtime. Defina os valores
 * abaixo ou, preferencialmente, injete window.__FINSCORE_SUPABASE__
 * antes do módulo ser carregado.
 */
export const SUPABASE_URL =
  window.__FINSCORE_SUPABASE__?.url || "https://SEU-PROJETO.supabase.co";

export const SUPABASE_ANON_KEY =
  window.__FINSCORE_SUPABASE__?.anonKey || "SUA_ANON_KEY";
