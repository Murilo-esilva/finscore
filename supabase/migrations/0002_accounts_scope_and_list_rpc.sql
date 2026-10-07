-- FinScore / Supabase
-- Corrige isolamento das contas e evita que RLS/uma regra de unicidade
-- global causem o cenário "conta existe, mas meu usuário não enxerga".

alter table public.accounts
  drop constraint if exists accounts_active_name_unique;

drop index if exists public.accounts_active_name_unique;

create unique index if not exists accounts_active_name_unique
  on public.accounts (user_id, name)
  where status = 'active';

create or replace function public.list_my_accounts()
returns setof public.accounts
language sql
security definer
stable
set search_path = public
as $$
  select a.*
    from public.accounts a
   where a.user_id = auth.uid()
     and a.status = 'active'
   order by a.name asc;
$$;

revoke all on function public.list_my_accounts() from public;
grant execute on function public.list_my_accounts() to authenticated;
