-- FinScore / Supabase
-- Garante persistência consistente do saldo inicial.

create or replace function public.create_account(
  p_name text,
  p_type public.account_type,
  p_opening_cents bigint default 0,
  p_opening_on date default current_date,
  p_include_in_net_worth boolean default true
)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_account public.accounts;
  v_direction public.entry_direction;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'account_name_required';
  end if;

  insert into public.accounts (
    user_id, name, type, status, opening_balance_on,
    include_in_cash, include_in_net_worth, opening_balance_cents
  )
  values (
    v_user_id, trim(p_name), p_type, 'active'::public.account_status,
    coalesce(p_opening_on, current_date), p_type <> 'credit_card',
    coalesce(p_include_in_net_worth, true), coalesce(p_opening_cents, 0)
  )
  returning * into v_account;

  if coalesce(p_opening_cents, 0) <> 0 then
    v_direction := case
      when p_opening_cents > 0 then 'credit'::public.entry_direction
      else 'debit'::public.entry_direction
    end;

    insert into public.transactions (
      user_id, account_id, kind, direction, amount_cents, occurred_on,
      budget_on, description, metadata
    )
    values (
      v_user_id, v_account.id, 'opening_balance'::public.transaction_kind,
      v_direction, abs(p_opening_cents), coalesce(p_opening_on, current_date),
      null, 'Saldo inicial', jsonb_build_object('source', 'create_account')
    );
  end if;

  return v_account;
end;
$$;

revoke all on function public.create_account(text, public.account_type, bigint, date, boolean) from public;
grant execute on function public.create_account(text, public.account_type, bigint, date, boolean) to authenticated;