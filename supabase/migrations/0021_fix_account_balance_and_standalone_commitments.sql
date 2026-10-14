-- FinScore / Correcao inicial: avulsos e saldo consistente.
-- Preserva os dois lados de reversoes para que o efeito liquido seja zero.
-- opening_balance_cents prevalece sobre a transacao de abertura legada.
-- Dependencias: migrations 0001..0020 e schema ja aplicado no Supabase.

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
        case when t.kind <> 'opening_balance'::public.transaction_kind
                  and t.occurred_on <= current_date
             then case when t.direction = 'credit'::public.entry_direction
                       then t.amount_cents else -t.amount_cents end
             else 0 end
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
    null
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


-- FinScore / Supabase
-- CRUD de compromissos futuros e recorrencias.

drop function if exists public.update_commitment(uuid, uuid, uuid, public.commitment_kind, bigint, date, text);
create function public.update_commitment(
  p_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.commitment_kind,
  p_amount_cents bigint,
  p_due_on date,
  p_description text
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
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'amount_must_be_positive'; end if;
  if p_due_on is null then raise exception 'due_date_required'; end if;
  if nullif(trim(p_description), '') is null then raise exception 'description_required'; end if;
  if p_kind = 'expense'::public.commitment_kind and p_category_id is null then
    raise exception 'category_required_for_expense_commitment';
  end if;

  select * into v_commitment
    from public.commitments c
   where c.id = p_id
     and c.user_id = v_user_id
     and c.recurrence_rule_id is null
     and c.status in ('planned'::public.commitment_status, 'confirmed'::public.commitment_status);

  if not found then raise exception 'commitment_not_found_or_not_editable'; end if;

  if p_account_id is not null and not exists (
    select 1 from public.accounts a
     where a.id = p_account_id and a.user_id = v_user_id
       and a.status = 'active'::public.account_status
  ) then raise exception 'account_not_found'; end if;

  if p_category_id is not null and not exists (
    select 1 from public.categories c
     where c.id = p_category_id
       and (c.user_id is null or c.user_id = v_user_id)
       and c.archived_at is null
  ) then raise exception 'category_not_found'; end if;

  update public.commitments
     set account_id = p_account_id,
         category_id = p_category_id,
         kind = p_kind,
         amount_cents = p_amount_cents,
         due_on = p_due_on,
         occurrence_on = null,
         description = trim(p_description),
         updated_at = now()
   where id = p_id
  returning * into v_commitment;

  return v_commitment;
end;
$$;

revoke all on function public.update_commitment(uuid, uuid, uuid, public.commitment_kind, bigint, date, text) from public;
grant execute on function public.update_commitment(uuid, uuid, uuid, public.commitment_kind, bigint, date, text) to authenticated;




notify pgrst, 'reload schema';
