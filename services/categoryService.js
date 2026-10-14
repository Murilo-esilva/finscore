import { exigirSupabase } from "../src/core/supabase/client.js";

let categoriasCache = new Map();
let categoriasPromises = new Map();
const CATEGORIAS_CACHE_TTL = 10000;

function chaveCache(incluirArquivadas) {
  return incluirArquivadas ? "all" : "active";
}

function normalizarCategorias(data = []) {
  const unicas = new Map();

  for (const categoria of data) {
    const chave = `${categoria.nature}:${String(categoria.name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
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

export function limparCacheCategorias() {
  categoriasCache.clear();
  categoriasPromises.clear();
}

export async function listarCategorias({ incluirArquivadas = false, force = false } = {}) {
  const client = exigirSupabase();
  const chave = chaveCache(incluirArquivadas);
  const cache = categoriasCache.get(chave);
  const agora = Date.now();

  if (!force && cache && agora - cache.at < CATEGORIAS_CACHE_TTL) {
    return cache.data;
  }

  const emAndamento = categoriasPromises.get(chave);
  if (!force && emAndamento) return emAndamento;

  const promise = (async () => {
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

    const resultado = normalizarCategorias(data || []);
    categoriasCache.set(chave, { data: resultado, at: Date.now() });
    return resultado;
  })();

  categoriasPromises.set(chave, promise);

  try {
    return await promise;
  } finally {
    categoriasPromises.delete(chave);
  }
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
  limparCacheCategorias();
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
  limparCacheCategorias();
  return data;
}

export async function arquivarCategoria(id) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("archive_category", { p_id: id });
  if (error) throw error;
  limparCacheCategorias();
  return data;
}

export async function excluirCategoria(id) {
  const client = exigirSupabase();

  const { data, error } = await client.rpc("delete_category", { p_id: id });
  if (error) throw error;
  limparCacheCategorias();
  return data;
}
