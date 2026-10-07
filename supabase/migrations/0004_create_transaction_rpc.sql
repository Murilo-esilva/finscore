-- FinScore / Supabase
-- Cria lançamentos financeiros via RPC, mantendo as mutações protegidas no banco.

drop function if exists public.create_transaction(uuid, public.transaction_kind, public.entry_direction, bigint, date, date, text);

create function public.create_transaction(
  p_account_id uuid,
  p_kind public.transaction_kind,
  p_direction public.entry_direction,
  p_amount_cents bigint,
  p_occurred_on date,
  p_budget_on date default null,
  p_description text default ''
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_transaction public.transactions;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_account_id is null then
    raise exception 'account_required';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  if p_occurred_on is null then
    raise exception 'transaction_date_required';
  end if;

  if nullif(trim(p_description), '') is null then
    raise exception 'description_required';
  end if;

  if p_kind = 'opening_balance'::public.transaction_kind then
    raise exception 'opening_balance_is_system_generated';
  end if;

  if not exists (
    select 1
      from public.accounts a
     where a.id = p_account_id
       and a.user_id = v_user_id
       and a.status = 'active'::public.account_status
  ) then
    raise exception 'account_not_found';
  end if;

  if p_budget_on is not null and p_budget_on < p_occurred_on then
    raise exception 'budget_date_before_occurrence';
  end if;

  insert into public.transactions (
    user_id,
    account_id,
    kind,
    direction,
    amount_cents,
    occurred_on,
    budget_on,
    description
  )
  values (
    v_user_id,
    p_account_id,
    p_kind,
    p_direction,
    p_amount_cents,
    p_occurred_on,
    coalesce(p_budget_on, p_occurred_on),
    trim(p_description)
  )
  returning * into v_transaction;

  return v_transaction;
end;
$$;

revoke all on function public.create_transaction(
  uuid, public.transaction_kind, public.entry_direction, bigint, date, date, text
) from public;

grant execute on function public.create_transaction(
  uuid, public.transaction_kind, public.entry_direction, bigint, date, date, text
) to authenticated;


-- Atualiza o schema cache do PostgREST após a criação/alteração da RPC.
notify pgrst, 'reload schema';
