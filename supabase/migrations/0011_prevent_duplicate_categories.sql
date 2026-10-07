-- FinScore / Supabase
-- Impede novas categorias personalizadas equivalentes às categorias já visíveis.
-- Categorias existentes não são apagadas nem alteradas por esta migration.

create or replace function public.create_category(
  p_name text,
  p_nature public.category_nature,
  p_is_essential boolean default false,
  p_parent_id uuid default null
)
returns public.categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_category public.categories;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'category_name_required';
  end if;

  if exists (
    select 1
      from public.categories c
     where c.archived_at is null
       and c.nature = p_nature
       and (
         (c.user_id = v_user_id and c.is_system = false)
         or
         (c.user_id is null and c.is_system = true)
       )
       and lower(trim(c.name)) = lower(trim(p_name))
  ) then
    raise exception 'category_already_exists';
  end if;

  if p_parent_id is not null and not exists (
    select 1
      from public.categories c
     where c.id = p_parent_id
       and c.archived_at is null
       and (c.user_id is null or c.user_id = v_user_id)
  ) then
    raise exception 'category_parent_not_found';
  end if;

  insert into public.categories (
    user_id,
    name,
    nature,
    parent_id,
    is_essential,
    is_system
  )
  values (
    v_user_id,
    trim(p_name),
    p_nature,
    p_parent_id,
    coalesce(p_is_essential, false),
    false
  )
  returning * into v_category;

  return v_category;
end;
$$;

revoke all on function public.create_category(text, public.category_nature, boolean, uuid) from public;
grant execute on function public.create_category(text, public.category_nature, boolean, uuid) to authenticated;

notify pgrst, 'reload schema';
