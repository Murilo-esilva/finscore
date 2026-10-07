-- FinScore / Supabase
-- Exclusão segura de categorias.
-- Nunca remove categoria do sistema.
-- Se houver referências financeiras, apenas arquiva.

drop function if exists public.delete_category(uuid);

create function public.delete_category(
  p_id uuid
)
returns public.categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_category public.categories;
  v_referenced boolean := false;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into v_category
    from public.categories c
   where c.id = p_id
     and c.user_id = v_user_id
     and c.is_system = false;

  if not found then
    raise exception 'category_not_found';
  end if;

  select exists (
    select 1 from public.transactions t where t.category_id = p_id
    union all
    select 1 from public.commitments c where c.category_id = p_id
    union all
    select 1 from public.budgets b where b.category_id = p_id
    union all
    select 1 from public.categories child where child.parent_id = p_id
  ) into v_referenced;

  if v_referenced then
    update public.categories
       set archived_at = coalesce(archived_at, now()),
           updated_at = now()
     where id = p_id
    returning * into v_category;
  else
    delete from public.categories
     where id = p_id
    returning * into v_category;
  end if;

  return v_category;
end;
$$;

revoke all on function public.delete_category(uuid) from public;
grant execute on function public.delete_category(uuid) to authenticated;

notify pgrst, 'reload schema';
