-- FinScore / Supabase
-- Escopo de leitura das regras de recorrencia por usuario.

alter table public.recurrence_rules enable row level security;

drop policy if exists recurrence_rules_select_own on public.recurrence_rules;
create policy recurrence_rules_select_own
  on public.recurrence_rules
  for select
  using (user_id = auth.uid());

notify pgrst, 'reload schema';
