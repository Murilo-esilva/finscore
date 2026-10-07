import { exigirSupabase } from "../src/core/supabase/client.js";
import { listarContas, formatarSaldo, rotuloTipoConta } from "./accountService.js";

export async function listarLancamentos({ limite = 100 } = {}) {
  const client = exigirSupabase();
  const { data, error } = await client
    .from("transactions")
    .select("id,account_id,kind,direction,amount_cents,occurred_on,budget_on,description,created_at")
    .neq("kind", "opening_balance")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limite);

  if (error) throw error;

  const contas = await listarContas();
  const nomes = new Map(contas.map((conta) => [conta.id, conta]));

  return (data || []).map((item) => ({
    ...item,
    amount_cents: Number(item.amount_cents || 0),
    conta: nomes.get(item.account_id) || null,
  }));
}

export async function criarLancamento({
  account_id,
  type,
  amount_cents,
  occurred_on,
  description,
}) {
  const client = exigirSupabase();

  const kind = type === "income" ? "income" : "expense";
  const direction = type === "income" ? "credit" : "debit";

  const { data, error } = await client.rpc("create_transaction", {
    p_account_id: account_id,
    p_kind: kind,
    p_direction: direction,
    p_amount_cents: Math.abs(Number(amount_cents)),
    p_occurred_on: occurred_on,
    p_budget_on: occurred_on,
    p_description: description,
  });

  if (error) throw error;
  return data;
}

export { formatarSaldo, rotuloTipoConta };
