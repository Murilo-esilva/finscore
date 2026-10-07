-- FinScore / Supabase
-- Garante categorias padrão para o usuário autenticado.
-- Pode ser executada várias vezes sem duplicar categorias.

drop function if exists public.ensure_default_categories();

create function public.ensure_default_categories()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.categories (
    user_id,
    name,
    nature,
    parent_id,
    is_essential,
    is_system
  )
  select
    v_user_id,
    s.name,
    s.nature::public.category_nature,
    null,
    s.is_essential,
    false
  from (
    values
      ('Alimentação', 'expense', true),
      ('Moradia', 'expense', true),
      ('Transporte', 'expense', true),
      ('Saúde', 'expense', true),
      ('Educação', 'expense', false),
      ('Serviços', 'expense', false),
      ('Assinaturas', 'expense', false),
      ('Lazer', 'expense', false),
      ('Compras', 'expense', false),
      ('Impostos e taxas', 'expense', true),
      ('Outros', 'expense', false),
      ('Salário', 'income', false),
      ('Freelance', 'income', false),
      ('Rendimentos', 'income', false),
      ('Reembolsos', 'income', false),
      ('Outras receitas', 'income', false)
  ) as s(name, nature, is_essential)
  where not exists (
    select 1
      from public.categories c
     where c.user_id = v_user_id
       and c.name = s.name
       and c.nature = s.nature::public.category_nature
       and c.archived_at is null
  );
end;
$$;

revoke all on function public.ensure_default_categories() from public;
grant execute on function public.ensure_default_categories() to authenticated;

notify pgrst, 'reload schema';
