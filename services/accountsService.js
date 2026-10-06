import { supabase } from "./supabase.js";

const CAMPOS = "id,name,account_type,account_status,opening_balance_on,opening_balance_cents,include_in_cash,include_in_net_worth,color,archived_at,created_at";

export async function listarContas() {
  const { data, error } = await supabase.from("accounts").select(CAMPOS).eq("account_status", "active").order("name");
  if (error) throw error;
  return data || [];
}

export async function criarConta(conta) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão não encontrada.");
  const { data, error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: conta.name.trim(),
    account_type: conta.account_type,
    opening_balance_on: conta.opening_balance_on,
    opening_balance_cents: Math.round(Number(conta.opening_balance) * 100),
    include_in_cash: conta.include_in_cash,
    include_in_net_worth: conta.include_in_net_worth,
    color: conta.color || null
  }).select(CAMPOS).single();
  if (error) throw error;
  return data;
}
