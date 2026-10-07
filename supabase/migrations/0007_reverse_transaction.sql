-- FinScore / Supabase
-- Corrige uma condição redundante da migration de categorias.
-- Arquivar é a forma suportada de remover categorias do uso corrente.

-- Reversão financeira: cria um novo fato compensatório e preserva o original.
drop function if exists public.reverse_transaction(uuid);

create function public.reverse_transaction(
  p_transaction_id uuid
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_original public.transactions;
  v_reversal public.transactions;
  v_direction public.entry_direction;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into v_original
    from public.transactions t
   where t.id = p_transaction_id
     and t.user_id = v_user_id
     and t.kind <> 'opening_balance'::public.transaction_kind
     and t.kind <> 'reversal'::public.transaction_kind;

  if not found then
    raise exception 'transaction_not_found';
  end if;

  if exists (
    select 1
      from public.transactions t
     where t.user_id = v_user_id
       and t.original_transaction_id = p_transaction_id
       and t.kind = 'reversal'::public.transaction_kind
  ) then
    raise exception 'transaction_already_reversed';
  end if;

  v_direction := case
    when v_original.direction = 'credit'::public.entry_direction
      then 'debit'::public.entry_direction
    else 'credit'::public.entry_direction
  end;

  insert into public.transactions (
    user_id,
    account_id,
    category_id,
    kind,
    direction,
    amount_cents,
    occurred_on,
    budget_on,
    description,
    original_transaction_id,
    metadata
  )
  values (
    v_user_id,
    v_original.account_id,
    v_original.category_id,
    'reversal'::public.transaction_kind,
    v_direction,
    v_original.amount_cents,
    current_date,
    current_date,
    'Reversão: ' || v_original.description,
    v_original.id,
    jsonb_build_object('source', 'reverse_transaction')
  )
  returning * into v_reversal;

  return v_reversal;
end;
$$;

revoke all on function public.reverse_transaction(uuid) from public;
grant execute on function public.reverse_transaction(uuid) to authenticated;

notify pgrst, 'reload schema';
