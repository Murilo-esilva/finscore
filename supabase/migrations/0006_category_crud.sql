-- FinScore / Supabase
-- CRUD seguro de categorias do usuário.
-- Categorias são arquivadas, não apagadas fisicamente, para preservar histórico.

drop function if exists public.create_category(text, public.category_nature, boolean, uuid);
drop function if exists public.update_category(uuid, text, boolean, uuid);
drop function if exists public.archive_category(uuid);

create function public.create_category(
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

  if p_parent_id is not null and not exists (
    select 1
      from public.categories c
     where c.id = p_parent_id
       and c.archived_at is null
       and (c.user_id is null or c.user_id = v_user_id)
  ) then
    raise exception 'category_parent_not_found';
  end if;

  if p_parent_id is not null and p_parent_id = null then
    raise exception 'category_parent_invalid';
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

create function public.update_category(
  p_id uuid,
  p_name text,
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

  select *
    into v_category
    from public.categories c
   where c.id = p_id
     and c.user_id = v_user_id
     and c.is_system = false
     and c.archived_at is null;

  if not found then
    raise exception 'category_not_found';
  end if;

  if p_parent_id = p_id then
    raise exception 'category_parent_invalid';
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

  update public.categories
     set name = trim(p_name),
         is_essential = coalesce(p_is_essential, false),
         parent_id = p_parent_id,
         updated_at = now()
   where id = p_id
     and user_id = v_user_id
  returning * into v_category;

  return v_category;
end;
$$;

create function public.archive_category(p_id uuid)
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

  update public.categories
     set archived_at = now(),
         updated_at = now()
   where id = p_id
     and user_id = v_user_id
     and is_system = false
     and archived_at is null
  returning * into v_category;

  if not found then
    raise exception 'category_not_found';
  end if;

  return v_category;
end;
$$;

revoke all on function public.create_category(text, public.category_nature, boolean, uuid) from public;
grant execute on function public.create_category(text, public.category_nature, boolean, uuid) to authenticated;

revoke all on function public.update_category(uuid, text, boolean, uuid) from public;
grant execute on function public.update_category(uuid, text, boolean, uuid) to authenticated;

revoke all on function public.archive_category(uuid) from public;
grant execute on function public.archive_category(uuid) to authenticated;

notify pgrst, 'reload schema';
