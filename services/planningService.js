import { exigirSupabase } from "../src/core/supabase/client.js";
import { listarContas, rotuloTipoConta } from "./accountService.js";

export async function listarCategoriasPlanejamento() {
  const client = exigirSupabase();

  const { error: bootstrapError } = await client.rpc("ensure_default_categories");
  if (bootstrapError) throw bootstrapError;

  const { data, error } = await client
    .from("categories")
    .select("id,name,nature,is_system,archived_at")
    .is("archived_at", null)
    .order("nature", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  const unicas = new Map();
  for (const categoria of data || []) {
    const chave = `${categoria.nature}:${String(categoria.name || "")
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .trim()
      .toLowerCase()}`;

    const existente = unicas.get(chave);
    if (!existente || (categoria.is_system && !existente.is_system)) {
      unicas.set(chave, categoria);
    }
  }

  return [...unicas.values()].sort((a, b) => {
    if (a.nature !== b.nature) return a.nature.localeCompare(b.nature);
    return String(a.name).localeCompare(String(b.name), "pt-BR");
  });
}

export async function listarCompromissos({ limite = 100 } = {}) {
  const client = exigirSupabase();

  const { data, error } = await client
    .from("commitments")
    .select("id,account_id,category_id,kind,status,amount_cents,due_on,description,occurrence_on,created_at")
    .in("status", ["planned", "confirmed"])
    .order("due_on", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limite);

  if (error) throw error;

  const [contas, categorias] = await Promise.all([
    listarContas(),
    listarCategoriasPlanejamento(),
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

export async function criarCompromisso({
  account_id = null,
  category_id = null,
  kind = "expense",
  amount_cents,
  due_on,
  description,
}) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("create_commitment", {
    p_account_id: account_id || null,
    p_category_id: category_id || null,
    p_kind: kind,
    p_amount_cents: Math.abs(Number(amount_cents)),
    p_due_on: due_on,
    p_description: description,
  });

  if (error) throw error;
  return data;
}

export { rotuloTipoConta };
