import { exigirSupabase } from "../src/core/supabase/client.js";

export async function listarContas() {
  const client = exigirSupabase();

  const { data, error } = await client
    .from("accounts")
    .select("id,name,type,status,opening_cents")
    .eq("status", "active")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function criarConta({
  name,
  account_type,
  opening_balance_cents = 0,
  opening_balance_on,
}) {
  const client = exigirSupabase();

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session?.user) {
    throw new Error("Sessão Supabase não encontrada.");
  }

  const { data, error } = await client.rpc("create_account", {
    p_name: name,
    p_type: account_type,
    p_opening_cents: opening_balance_cents,
    p_opening_on: opening_balance_on,
    p_include_in_net_worth: true,
  });

  if (error) throw error;
  return data;
}

export function formatarSaldo(cents = 0) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(cents) / 100);
}

export function rotuloTipoConta(type) {
  return {
    checking: "Conta corrente",
    cash: "Dinheiro",
    savings: "Poupança",
    investment: "Investimentos",
    credit_card: "Cartão de crédito",
  }[type] || type;
}
