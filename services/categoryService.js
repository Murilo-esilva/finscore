import { exigirSupabase } from "../src/core/supabase/client.js";

export async function listarCategorias({ incluirArquivadas = false } = {}) {
  const client = exigirSupabase();

  if (!incluirArquivadas) {
    const { error: bootstrapError } = await client.rpc("ensure_default_categories");
    if (bootstrapError) throw bootstrapError;
  }

  let query = client
    .from("categories")
    .select("id,user_id,name,nature,parent_id,is_essential,is_system,archived_at,created_at,updated_at")
    .order("nature", { ascending: true })
    .order("name", { ascending: true });

  if (!incluirArquivadas) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) throw error;

  const unicas = new Map();
  for (const categoria of data || []) {
    const chave = `${categoria.nature}:${String(categoria.name || "")
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .trim()
      .toLowerCase()}`;

    const existente = unicas.get(chave);
    if (
      !existente ||
      (categoria.is_system && !existente.is_system)
    ) {
      unicas.set(chave, categoria);
    }
  }

  return [...unicas.values()].sort((a, b) => {
    if (a.nature !== b.nature) return a.nature.localeCompare(b.nature);
    return String(a.name).localeCompare(String(b.name), "pt-BR");
  });
}

export async function criarCategoria({ name, nature, is_essential = false, parent_id = null }) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("create_category", {
    p_name: name,
    p_nature: nature,
    p_is_essential: is_essential,
    p_parent_id: parent_id || null,
  });

  if (error) throw error;
  return data;
}

export async function atualizarCategoria({ id, name, is_essential = false, parent_id = null }) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("update_category", {
    p_id: id,
    p_name: name,
    p_is_essential: is_essential,
    p_parent_id: parent_id || null,
  });

  if (error) throw error;
  return data;
}

export async function arquivarCategoria(id) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("archive_category", {
    p_id: id,
  });

  if (error) throw error;
  return data;
}
