import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const configurado =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("SEU-PROJETO") &&
  !SUPABASE_ANON_KEY.includes("SUA_ANON_KEY");

export const supabase = configurado
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function exigirSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase ainda não configurado. Defina SUPABASE_URL e SUPABASE_ANON_KEY."
    );
  }

  return supabase;
}
