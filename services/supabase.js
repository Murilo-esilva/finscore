import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = window.FINSCORE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.FINSCORE_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("FinScore: Supabase ainda não configurado.");
}

export const supabase = createClient(SUPABASE_URL || "https://placeholder.invalid", SUPABASE_ANON_KEY || "placeholder");

export async function obterSessao() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
