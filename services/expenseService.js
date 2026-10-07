import { exigirSupabase } from "../src/core/supabase/client.js";
import { listarContas, formatarSaldo, rotuloTipoConta } from "./accountService.js";

export async function listarCategorias() {
  const client = exigirSupabase();

  const { data, error } = await client
    .from("categories")
    .select("id,name")
    .order("name", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function listarLancamentos({ limite = 100 } = {}) {
  const client = exigirSupabase();
  const { data, error } = await client
    .from("transactions")
    .select("id,account_id,category_id,kind,direction,amount_cents,occurred_on,budget_on,description,created_at")
    .neq("kind", "opening_balance")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limite);

  if (error) throw error;

  const [contas, categorias] = await Promise.all([
    listarContas(),
    listarCategorias(),
  ]);

  const contasPorId = new Map(contas.map((conta) => [conta.id, conta]));
  const categoriasPorId = new Map(categorias.map((categoria) => [categoria.id, categoria]));

  return (data || []).map((item) => ({
    ...item,
    amount_cents: Number(item.amount_cents || 0),
    conta: contasPorId.get(item.account_id) || null,
    categoria: categoriasPorId.get(item.category_id) || null,
  }));
}

export async function criarLancamento({
  account_id,
  category_id,
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
    p_category_id: category_id || null,
  });

  if (error) throw error;
  return data;
}

export { formatarSaldo, rotuloTipoConta };
