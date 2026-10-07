-- FinScore / Supabase
-- Cria compromissos planejados sem gravar lançamentos realizados.

drop function if exists public.create_commitment(uuid, uuid, public.commitment_kind, bigint, date, text);

create function public.create_commitment(
  p_account_id uuid default null,
  p_category_id uuid default null,
  p_kind public.commitment_kind default 'expense',
  p_amount_cents bigint default 0,
  p_due_on date default current_date,
  p_description text default ''
)
returns public.commitments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_commitment public.commitments;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  if p_due_on is null then
    raise exception 'due_date_required';
  end if;

  if nullif(trim(p_description), '') is null then
    raise exception 'description_required';
  end if;

  if p_kind = 'expense'::public.commitment_kind and p_category_id is null then
    raise exception 'category_required_for_expense_commitment';
  end if;

  if p_account_id is not null and not exists (
    select 1
      from public.accounts a
     where a.id = p_account_id
       and a.user_id = v_user_id
       and a.status = 'active'::public.account_status
  ) then
    raise exception 'account_not_found';
  end if;

  if p_category_id is not null and not exists (
    select 1
      from public.categories c
     where c.id = p_category_id
       and (c.user_id is null or c.user_id = v_user_id)
       and c.archived_at is null
  ) then
    raise exception 'category_not_found';
  end if;

  insert into public.commitments (
    user_id,
    account_id,
    category_id,
    kind,
    status,
    amount_cents,
    due_on,
    description,
    occurrence_on
  )
  values (
    v_user_id,
    p_account_id,
    p_category_id,
    p_kind,
    'planned'::public.commitment_status,
    p_amount_cents,
    p_due_on,
    trim(p_description),
    p_due_on
  )
  returning * into v_commitment;

  return v_commitment;
end;
$$;

revoke all on function public.create_commitment(
  uuid, uuid, public.commitment_kind, bigint, date, text
) from public;

grant execute on function public.create_commitment(
  uuid, uuid, public.commitment_kind, bigint, date, text
) to authenticated;

notify pgrst, 'reload schema';
