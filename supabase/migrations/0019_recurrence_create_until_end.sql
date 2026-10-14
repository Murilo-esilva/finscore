-- FinScore / Supabase
-- Recorrencia: quando existe data final explicita, materializa ate a data final.
-- Sem data final, respeita o horizonte de projecao do usuario.

create or replace function public.create_recurring_commitment(
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.commitment_kind default 'expense',
  p_amount_cents bigint default 0,
  p_anchor_date date default current_date,
  p_description text default '',
  p_frequency public.recurrence_frequency default 'monthly',
  p_interval_count integer default 1,
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
  v_today date;
  v_horizon date;
  v_end date;
  v_occurrence date;
  v_first_index integer := null;
  v_first_date date := null;
  v_index integer;
  v_limit integer;
  v_created integer := 0;
  v_pref_months integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  if p_anchor_date is null then
    raise exception 'start_date_required';
  end if;

  if nullif(trim(p_description), '') is null then
    raise exception 'description_required';
  end if;

  if p_interval_count is null or p_interval_count <= 0 then
    raise exception 'interval_must_be_positive';
  end if;

  if p_max_occurrences is not null and (p_max_occurrences <= 0 or p_max_occurrences > 120) then
    raise exception 'max_occurrences_must_be_between_1_and_120';
  end if;

  if p_ends_on is not null and p_ends_on < p_anchor_date then
    raise exception 'end_date_before_start_date';
  end if;

  if p_day_of_month is not null and (p_day_of_month < 1 or p_day_of_month > 31) then
    raise exception 'day_of_month_must_be_between_1_and_31';
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

  v_today := (
    now() at time zone coalesce(
      (select timezone from public.user_preferences where user_id = v_user_id),
      'America/Sao_Paulo'
    )
  )::date;

  select coalesce(projection_horizon_months, 12)
    into v_pref_months
    from public.user_preferences
   where user_id = v_user_id;

  v_pref_months := greatest(1, least(coalesce(v_pref_months, 12), 120));
  v_horizon := (v_today + make_interval(months => v_pref_months))::date;
  v_end := case
    when p_ends_on is null then v_horizon
    else p_ends_on
  end;

  v_limit := least(coalesce(p_max_occurrences, 120), 120);

  for v_index in 0..119 loop
    exit when v_index >= v_limit;
    v_occurrence := public.recurrence_occurrence_date(
      p_anchor_date,
      p_frequency,
      p_interval_count,
      v_index,
      p_day_of_month
    );

    if v_occurrence >= v_today then
      if v_occurrence <= v_end then
        v_first_index := v_index;
        v_first_date := v_occurrence;
      end if;
      exit;
    end if;
  end loop;

  if v_first_date is null then
    raise exception 'recurrence_has_no_future_occurrence';
  end if;

  insert into public.recurrence_rules (
    user_id,
    frequency,
    interval_count,
    anchor_date,
    day_of_month,
    ends_on,
    max_occurrences,
    active,
    materialized_until
  )
  values (
    v_user_id,
    p_frequency,
    p_interval_count,
    p_anchor_date,
    case when p_frequency = 'monthly'::public.recurrence_frequency
      then coalesce(p_day_of_month, extract(day from p_anchor_date)::integer)
      else null
    end,
    p_ends_on,
    p_max_occurrences,
    true,
    null
  )
  returning * into v_rule;

  for v_index in v_first_index..119 loop
    exit when v_index >= v_limit;

    v_occurrence := public.recurrence_occurrence_date(
      p_anchor_date,
      p_frequency,
      p_interval_count,
      v_index,
      p_day_of_month
    );

    exit when v_occurrence > v_end;

    insert into public.commitments (
      user_id,
      account_id,
      category_id,
      kind,
      status,
      amount_cents,
      due_on,
      description,
      recurrence_rule_id,
      occurrence_on
    )
    values (
      v_user_id,
      p_account_id,
      p_category_id,
      p_kind,
      'planned'::public.commitment_status,
      p_amount_cents,
      v_occurrence,
      trim(p_description),
      v_rule.id,
      v_occurrence
    )
    on conflict (user_id, recurrence_rule_id, occurrence_on) where recurrence_rule_id is not null do nothing;

    v_created := v_created + 1;
    v_rule.materialized_until := v_occurrence;
  end loop;

  update public.recurrence_rules
     set materialized_until = v_rule.materialized_until,
         updated_at = now()
   where id = v_rule.id
  returning * into v_rule;

  return jsonb_build_object(
    'recurrence_rule_id', v_rule.id,
    'created_commitments', v_created
  );
end;
$$;

revoke all on function public.create_recurring_commitment(
  uuid, uuid, public.commitment_kind, bigint, date, text,
  public.recurrence_frequency, integer, integer, date, integer
) from public;
grant execute on function public.create_recurring_commitment(
  uuid, uuid, public.commitment_kind, bigint, date, text,
  public.recurrence_frequency, integer, integer, date, integer
) to authenticated;

notify pgrst, 'reload schema';
