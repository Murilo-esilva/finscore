import { exigirSupabase } from "../src/core/supabase/client.js";

let contasCache = null;
let contasCacheAt = 0;
let contasPromise = null;
const CONTAS_CACHE_TTL = 5000;

export function limparCacheContas() {
  contasCache = null;
  contasCacheAt = 0;
}

export async function listarContas({ force = false } = {}) {
  const agora = Date.now();

  if (!force && contasCache && agora - contasCacheAt < CONTAS_CACHE_TTL) {
    return contasCache;
  }

  if (!force && contasPromise) {
    return contasPromise;
  }

  const client = exigirSupabase();

  contasPromise = (async () => {
    const { data, error } = await client.rpc("list_my_accounts_with_balance");
    if (error) throw error;

    contasCache = (data || []).map((conta) => ({
      ...conta,
      opening_balance_cents: Number(conta.opening_balance_cents ?? 0),
      balance_cents: Number(conta.balance_cents ?? 0),
    }));

    contasCacheAt = Date.now();
    return contasCache;
  })();

  try {
    return await contasPromise;
  } finally {
    contasPromise = null;
  }
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
  limparCacheContas();
  return data;
}

export async function atualizarConta({
  id,
  name,
  account_type,
  include_in_cash = true,
  include_in_net_worth = true,
  color = null,
}) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("update_account", {
    p_id: id,
    p_name: name,
    p_type: account_type,
    p_include_in_cash: include_in_cash,
    p_include_in_net_worth: include_in_net_worth,
    p_color: color,
  });

  if (error) throw error;
  limparCacheContas();
  return data;
}

export async function excluirConta(id) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("delete_account", {
    p_id: id,
  });

  if (error) throw error;
  limparCacheContas();
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
