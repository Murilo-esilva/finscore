-- FinScore / Supabase
-- A partir desta migration, os padrões são exclusivamente categorias do sistema.
-- O bootstrap não cria mais cópias por usuário.

drop function if exists public.ensure_default_categories();

create function public.ensure_default_categories()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  -- Categorias padrão são fornecidas por categories.user_id IS NULL.
  -- Esta função permanece para compatibilidade com o frontend.
  return;
end;
$$;

revoke all on function public.ensure_default_categories() from public;
grant execute on function public.ensure_default_categories() to authenticated;

notify pgrst, 'reload schema';
