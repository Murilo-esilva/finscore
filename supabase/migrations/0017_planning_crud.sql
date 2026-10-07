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
         occurrence_on = p_due_on,
         description = trim(p_description),
         updated_at = now()
   where id = p_id
  returning * into v_commitment;

  return v_commitment;
end;
$$;

revoke all on function public.update_commitment(uuid, uuid, uuid, public.commitment_kind, bigint, date, text) from public;
grant execute on function public.update_commitment(uuid, uuid, uuid, public.commitment_kind, bigint, date, text) to authenticated;


drop function if exists public.delete_commitment(uuid);
create function public.delete_commitment(p_id uuid)
returns public.commitments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_commitment public.commitments;
  v_today date := current_date;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  update public.commitments
     set status = 'cancelled'::public.commitment_status,
         updated_at = now()
   where id = p_id
     and user_id = v_user_id
     and recurrence_rule_id is null
     and status in ('planned'::public.commitment_status, 'confirmed'::public.commitment_status)
     and due_on >= v_today
  returning * into v_commitment;

  if not found then raise exception 'commitment_not_found_or_not_deletable'; end if;
  return v_commitment;
end;
$$;

revoke all on function public.delete_commitment(uuid) from public;
grant execute on function public.delete_commitment(uuid) to authenticated;


drop function if exists public.update_recurrence_rule(uuid, uuid, uuid, public.commitment_kind, bigint, date, text, public.recurrence_frequency, integer, integer, date, integer);
create function public.update_recurrence_rule(
  p_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.commitment_kind,
  p_amount_cents bigint,
  p_anchor_date date,
  p_description text,
  p_frequency public.recurrence_frequency,
  p_interval_count integer,
  p_day_of_month integer default null,
  p_ends_on date default null,
  p_max_occurrences integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rule public.recurrence_rules;
  v_today date := current_date;
  v_horizon date;
  v_end date;
  v_occurrence date;
  v_index integer;
  v_first_index integer := null;
  v_pref_months integer;
  v_limit integer := least(coalesce(p_max_occurrences, 120), 120);
  v_created integer := 0;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'amount_must_be_positive'; end if;
  if p_anchor_date is null then raise exception 'start_date_required'; end if;
  if nullif(trim(p_description), '') is null then raise exception 'description_required'; end if;
  if p_interval_count is null or p_interval_count <= 0 then raise exception 'interval_must_be_positive'; end if;
  if p_max_occurrences is not null and (p_max_occurrences <= 0 or p_max_occurrences > 120) then
    raise exception 'max_occurrences_must_be_between_1_and_120';
  end if;
  if p_ends_on is not null and p_ends_on < p_anchor_date then raise exception 'end_date_before_start_date'; end if;
  if p_day_of_month is not null and (p_day_of_month < 1 or p_day_of_month > 31) then
    raise exception 'day_of_month_must_be_between_1_and_31';
  end if;
  if p_kind = 'expense'::public.commitment_kind and p_category_id is null then
    raise exception 'category_required_for_expense_commitment';
  end if;

  select * into v_rule
    from public.recurrence_rules r
   where r.id = p_id
     and r.user_id = v_user_id
     and r.active = true;

  if not found then raise exception 'recurrence_not_found_or_not_editable'; end if;

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

  select coalesce(projection_horizon_months, 12)
    into v_pref_months
    from public.user_preferences
   where user_id = v_user_id;

  v_pref_months := greatest(1, least(coalesce(v_pref_months, 12), 120));
  v_horizon := (v_today + make_interval(months => v_pref_months))::date;
  v_end := case when p_ends_on is null then v_horizon else least(p_ends_on, v_horizon) end;

  for v_index in 0..119 loop
    exit when v_index >= v_limit;
    v_occurrence := public.recurrence_occurrence_date(
      p_anchor_date, p_frequency, p_interval_count, v_index, p_day_of_month
    );
    if v_occurrence >= v_today then
      if v_occurrence <= v_end then
        v_first_index := v_index;
      end if;
      exit;
    end if;
  end loop;

  if v_first_index is null then raise exception 'recurrence_has_no_future_occurrence'; end if;

  update public.recurrence_rules
     set frequency = p_frequency,
         interval_count = p_interval_count,
         anchor_date = p_anchor_date,
         day_of_month = case
           when p_frequency = 'monthly'::public.recurrence_frequency
           then coalesce(p_day_of_month, extract(day from p_anchor_date)::integer)
           else null
         end,
         ends_on = p_ends_on,
         max_occurrences = p_max_occurrences,
         active = true,
         materialized_until = null,
         updated_at = now()
   where id = p_id;

  update public.commitments
     set status = 'cancelled'::public.commitment_status,
         updated_at = now()
   where user_id = v_user_id
     and recurrence_rule_id = p_id
     and status in ('planned'::public.commitment_status, 'confirmed'::public.commitment_status)
     and due_on >= v_today;

  for v_index in v_first_index..119 loop
    exit when v_index >= v_limit;

    v_occurrence := public.recurrence_occurrence_date(
      p_anchor_date, p_frequency, p_interval_count, v_index, p_day_of_month
    );
    exit when v_occurrence > v_end;

    insert into public.commitments (
      user_id, account_id, category_id, kind, status, amount_cents,
      due_on, description, recurrence_rule_id, occurrence_on
    )
    values (
      v_user_id, p_account_id, p_category_id, p_kind,
      'planned'::public.commitment_status, p_amount_cents,
      v_occurrence, trim(p_description), p_id, v_occurrence
    )
    on conflict (user_id, recurrence_rule_id, occurrence_on)
      where recurrence_rule_id is not null
      do update set
        account_id = excluded.account_id,
        category_id = excluded.category_id,
        kind = excluded.kind,
        amount_cents = excluded.amount_cents,
        due_on = excluded.due_on,
        description = excluded.description,
        status = 'planned'::public.commitment_status,
        updated_at = now();

    v_created := v_created + 1;
  end loop;

  update public.recurrence_rules
     set materialized_until = (
       select max(c.occurrence_on)
         from public.commitments c
        where c.recurrence_rule_id = p_id
          and c.user_id = v_user_id
          and c.status in ('planned'::public.commitment_status, 'confirmed'::public.commitment_status)
     ),
         updated_at = now()
   where id = p_id;

  return jsonb_build_object(
    'recurrence_rule_id', p_id,
    'created_commitments', v_created
  );
end;
$$;

revoke all on function public.update_recurrence_rule(
  uuid, uuid, uuid, public.commitment_kind, bigint, date, text,
  public.recurrence_frequency, integer, integer, date, integer
) from public;
grant execute on function public.update_recurrence_rule(
  uuid, uuid, uuid, public.commitment_kind, bigint, date, text,
  public.recurrence_frequency, integer, integer, date, integer
) to authenticated;

notify pgrst, 'reload schema';
