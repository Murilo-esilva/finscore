import { exigirSupabase } from "../src/core/supabase/client.js";
import { listarContas, rotuloTipoConta } from "./accountService.js";
import { listarCategorias as listarCategoriasBase } from "./categoryService.js?v=20261007-category4";

export async function listarCategoriasPlanejamento() {
  return listarCategoriasBase();
}

export async function listarCompromissos({ limite = 100 } = {}) {
  const client = exigirSupabase();

  const { error: materializeError } = await client.rpc("materialize_my_recurrences");
  if (materializeError) throw materializeError;

  const { data, error } = await client
    .from("commitments")
    .select("id,account_id,category_id,kind,status,amount_cents,due_on,description,occurrence_on,recurrence_rule_id,created_at")
    .in("status", ["planned", "confirmed"])
    .gte("due_on", new Date().toISOString().slice(0, 10))
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

export async function listarRecorrencias() {
  const client = exigirSupabase();

  const { data: rules, error: rulesError } = await client
    .from("recurrence_rules")
    .select("id,frequency,interval_count,anchor_date,day_of_month,ends_on,max_occurrences,active,materialized_until,created_at")
    .order("active", { ascending: false })
    .order("created_at", { ascending: false });

  if (rulesError) throw rulesError;

  const ids = (rules || []).map((rule) => rule.id);
  if (!ids.length) return [];

  const { data: commitments, error: commitmentsError } = await client
    .from("commitments")
    .select("recurrence_rule_id,description,amount_cents,kind,account_id,category_id,status")
    .in("recurrence_rule_id", ids)
    .in("status", ["planned", "confirmed"])
    .order("occurrence_on", { ascending: true });

  if (commitmentsError) throw commitmentsError;

  const templates = new Map();
  for (const item of commitments || []) {
    if (!templates.has(item.recurrence_rule_id)) templates.set(item.recurrence_rule_id, item);
  }

  const [contas, categorias] = await Promise.all([
    listarContas(),
    listarCategoriasPlanejamento(),
  ]);

  const contasPorId = new Map(contas.map((conta) => [conta.id, conta]));
  const categoriasPorId = new Map(categorias.map((categoria) => [categoria.id, categoria]));

  return (rules || []).map((rule) => {
    const template = templates.get(rule.id);
    return {
      ...rule,
      template: template
        ? {
            ...template,
            amount_cents: Number(template.amount_cents || 0),
            conta: contasPorId.get(template.account_id) || null,
            categoria: categoriasPorId.get(template.category_id) || null,
          }
        : null,
    };
  });
}

export async function atualizarCompromisso({
  id,
  account_id = null,
  category_id = null,
  kind = "expense",
  amount_cents,
  due_on,
  description,
}) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("update_commitment", {
    p_id: id,
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

export async function excluirCompromisso(id) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("delete_commitment", {
    p_id: id,
  });

  if (error) throw error;
  return data;
}

export async function atualizarRecorrencia({
  id,
  account_id,
  category_id = null,
  kind = "expense",
  amount_cents,
  anchor_date,
  description,
  frequency,
  interval_count = 1,
  day_of_month = null,
  ends_on = null,
  max_occurrences = null,
}) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("update_recurrence_rule", {
    p_id: id,
    p_account_id: account_id || null,
    p_category_id: category_id || null,
    p_kind: kind,
    p_amount_cents: Math.abs(Number(amount_cents)),
    p_anchor_date: anchor_date,
    p_description: description,
    p_frequency: frequency,
    p_interval_count: Number(interval_count || 1),
    p_day_of_month: day_of_month ? Number(day_of_month) : null,
    p_ends_on: ends_on || null,
    p_max_occurrences: max_occurrences ? Number(max_occurrences) : null,
  });

  if (error) throw error;
  return data;
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

export async function criarRecorrencia({
  account_id,
  category_id = null,
  kind = "expense",
  amount_cents,
  anchor_date,
  description,
  frequency,
  interval_count = 1,
  day_of_month = null,
  ends_on = null,
  max_occurrences = null,
}) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("create_recurring_commitment", {
    p_account_id: account_id || null,
    p_category_id: category_id || null,
    p_kind: kind,
    p_amount_cents: Math.abs(Number(amount_cents)),
    p_anchor_date: anchor_date,
    p_description: description,
    p_frequency: frequency,
    p_interval_count: Number(interval_count || 1),
    p_day_of_month: day_of_month ? Number(day_of_month) : null,
    p_ends_on: ends_on || null,
    p_max_occurrences: max_occurrences ? Number(max_occurrences) : null,
  });

  if (error) throw error;
  return data;
}

export async function encerrarRecorrencia(id) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("cancel_recurrence_rule", {
    p_id: id,
  });

  if (error) throw error;
  return data;
}

export { rotuloTipoConta };
