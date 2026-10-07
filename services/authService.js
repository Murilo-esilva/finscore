import { exigirSupabase } from "../src/core/supabase/client.js";

export async function loginComEmailSenha(email, senha) {
  const client = exigirSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return data.user;
}

export async function cadastrarComEmailSenha(nome, email, senha) {
  const client = exigirSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password: senha,
    options: { data: { display_name: nome || "" } },
  });
  if (error) throw error;
  return data.user;
}

export async function enviarResetSenha(email) {
  const client = exigirSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/finscore/index.html",
  });
  if (error) throw error;
}

export async function logout() {
  const client = exigirSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export function observarAuth(callback) {
  let ativo = true;
  const client = exigirSupabase();
  client.auth.getSession().then(({ data }) => {
    if (ativo) callback(data.session?.user || null);
  });
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    if (ativo) callback(session?.user || null);
  });
  return () => {
    ativo = false;
    data.subscription.unsubscribe();
  };
}

export function mensagemDeErroAuth(error) {
  const mensagem = String(error?.message || error || "").toLowerCase();
  if (mensagem.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (mensagem.includes("user already registered")) return "Este e-mail já está cadastrado.";
  if (mensagem.includes("password")) return "A senha informada não atende aos requisitos.";
  if (mensagem.includes("invalid email")) return "E-mail inválido.";
  if (mensagem.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (mensagem.includes("network")) return "Falha de conexão. Verifique sua internet.";
  return error?.message || "Não foi possível concluir a operação. Tente novamente.";
}
