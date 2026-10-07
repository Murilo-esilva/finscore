-- FinScore / Supabase
-- CRUD de contas + leitura otimizada do saldo.
-- O saldo é calculado em uma unica consulta SQL, evitando buscar
-- todas as transacoes no navegador.

create or replace function public.list_my_accounts_with_balance()
returns table (
  id uuid,
  user_id uuid,
  name text,
  type public.account_type,
  status public.account_status,
  opening_balance_on date,
  include_in_cash boolean,
  include_in_net_worth boolean,
  color text,
  archived_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  opening_balance_cents bigint,
  balance_cents bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with minhas as (
    select a.*
      from public.accounts a
     where a.user_id = auth.uid()
       and a.status = 'active'::public.account_status
  ),
  movimentos as (
    select
      t.account_id,
      sum(
        case
          when t.kind = 'opening_balance'::public.transaction_kind then
            case when t.direction = 'credit'::public.entry_direction
              then t.amount_cents else -t.amount_cents end
          when t.occurred_on <= current_date then
            case when t.direction = 'credit'::public.entry_direction
              then t.amount_cents else -t.amount_cents end
          else 0
        end
      ) filter (
        where t.kind <> 'opening_balance'::public.transaction_kind
      ) as delta,
      sum(
        case
          when t.kind = 'opening_balance'::public.transaction_kind then
            case when t.direction = 'credit'::public.entry_direction
              then t.amount_cents else -t.amount_cents end
          else 0
        end
      ) as opening_transaction
    from public.transactions t
    join minhas a on a.id = t.account_id
    group by t.account_id
  )
  select
    a.id,
    a.user_id,
    a.name,
    a.type,
    a.status,
    a.opening_balance_on,
    a.include_in_cash,
    a.include_in_net_worth,
    a.color,
    a.archived_at,
    a.created_at,
    a.updated_at,
    a.opening_balance_cents,
    (
      case
        when a.opening_balance_cents <> 0
          then a.opening_balance_cents
        else coalesce(m.opening_transaction, 0)
      end
      + coalesce(m.delta, 0)
    )::bigint as balance_cents
  from minhas a
  left join movimentos m on m.account_id = a.id
  order by a.name asc;
$$;

revoke all on function public.list_my_accounts_with_balance() from public;
grant execute on function public.list_my_accounts_with_balance() to authenticated;


drop function if exists public.update_account(uuid, text, public.account_type, boolean, boolean, text);
create function public.update_account(
  p_id uuid,
  p_name text,
  p_type public.account_type,
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
  v_has_history boolean;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'account_name_required'; end if;

  select * into v_account
    from public.accounts a
   where a.id = p_id
     and a.user_id = v_user_id
     and a.status = 'active'::public.account_status;

  if not found then raise exception 'account_not_found'; end if;

  if p_type is null then raise exception 'account_type_required'; end if;
  if p_type = 'credit_card'::public.account_type then
    p_include_in_cash := false;
  end if;

  if exists (
    select 1
      from public.accounts a
     where a.user_id = v_user_id
       and a.status = 'active'::public.account_status
       and lower(trim(a.name)) = lower(trim(p_name))
       and a.id <> p_id
  ) then
    raise exception 'account_name_already_exists';
  end if;

  select exists (
    select 1
      from public.transactions t
     where t.account_id = p_id
  ) into v_has_history;

  if v_has_history and p_type <> v_account.type then
    raise exception 'account_type_locked_by_history';
  end if;

  update public.accounts
     set name = trim(p_name),
         type = p_type,
         include_in_cash = p_include_in_cash,
         include_in_net_worth = coalesce(p_include_in_net_worth, true),
         color = p_color,
         updated_at = now()
   where id = p_id
  returning * into v_account;

  return v_account;
end;
$$;

revoke all on function public.update_account(uuid, text, public.account_type, boolean, boolean, text) from public;
grant execute on function public.update_account(uuid, text, public.account_type, boolean, boolean, text) to authenticated;


drop function if exists public.delete_account(uuid);
create function public.delete_account(p_id uuid)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_account public.accounts;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  update public.accounts
     set status = 'archived'::public.account_status,
         archived_at = coalesce(archived_at, now()),
         updated_at = now()
   where id = p_id
     and user_id = v_user_id
     and status = 'active'::public.account_status
  returning * into v_account;

  if not found then raise exception 'account_not_found_or_already_archived'; end if;
  return v_account;
end;
$$;

revoke all on function public.delete_account(uuid) from public;
grant execute on function public.delete_account(uuid) to authenticated;

notify pgrst, 'reload schema';
