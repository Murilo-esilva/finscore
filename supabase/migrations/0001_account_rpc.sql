-- FinScore / Supabase
-- RPC usada pelo front para criar uma conta sem permitir INSERT direto
-- na tabela financeira.

create or replace function public.create_account(
  p_name text,
  p_account_type public.account_type,
  p_opening_balance_cents bigint default 0,
  p_opening_balance_on date default current_date,
  p_include_in_cash boolean default true,
  p_include_in_net_worth boolean default true,
  p_color text default null
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

  if p_opening_balance_on is null then
    raise exception 'opening_balance_date_required';
  end if;

  insert into public.accounts (
    user_id,
    name,
    account_type,
    account_status,
    opening_balance_on,
    include_in_cash,
    include_in_net_worth,
    color,
    opening_balance_cents
  )
  values (
    v_user_id,
    trim(p_name),
    p_account_type,
    'active',
    p_opening_balance_on,
    p_include_in_cash,
    p_include_in_net_worth,
    p_color,
    p_opening_balance_cents
  )
  returning * into v_account;

  if p_opening_balance_cents <> 0 then
    v_direction := case
      when p_opening_balance_cents > 0 then 'credit'::public.entry_direction
      else 'debit'::public.entry_direction
    end;

    insert into public.transactions (
      user_id,
      account_id,
      transaction_kind,
      entry_direction,
      amount_cents,
      occurred_on,
      budget_on,
      description,
      metadata
    )
    values (
      v_user_id,
      v_account.id,
      'opening_balance',
      v_direction,
      abs(p_opening_balance_cents),
      p_opening_balance_on,
      null,
      'Saldo inicial',
      jsonb_build_object('source', 'create_account')
    );
  end if;

  return v_account;
end;
$$;

revoke all on function public.create_account(text, public.account_type, bigint, date, boolean, boolean, text) from public;
grant execute on function public.create_account(text, public.account_type, bigint, date, boolean, boolean, text) to authenticated;
