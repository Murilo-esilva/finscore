import { exigirSupabase } from "../src/core/supabase/client.js";

export async function listarContas() {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("list_my_accounts");

  if (error) throw error;

  const contas = (data || []).map((conta) => ({
    ...conta,
    opening_balance_cents: Number(conta.opening_balance_cents ?? 0),
  }));

  if (!contas.length) return [];

  const ids = contas.map((conta) => conta.id);
  const { data: transacoes, error: transacoesError } = await client
    .from("transactions")
    .select("account_id,kind,direction,amount_cents")
    .in("account_id", ids);

  if (transacoesError) throw transacoesError;

  const porConta = new Map();

  for (const conta of contas) {
    porConta.set(conta.id, {
      opening: conta.opening_balance_cents,
      openingTransaction: 0,
      delta: 0,
    });
  }

  for (const transacao of transacoes || []) {
    const item = porConta.get(transacao.account_id);
    if (!item) continue;

    const amount = Number(transacao.amount_cents ?? 0);
    const signed = transacao.direction === "credit" ? amount : -amount;

    if (transacao.kind === "opening_balance") {
      item.openingTransaction += signed;
    } else {
      item.delta += signed;
    }
  }

  return contas.map((conta) => {
    const item = porConta.get(conta.id);
    const opening = item.opening !== 0
      ? item.opening
      : item.openingTransaction;

    return {
      ...conta,
      balance_cents: opening + item.delta,
    };
  });
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
