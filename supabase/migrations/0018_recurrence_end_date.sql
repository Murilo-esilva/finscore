-- FinScore / Supabase
-- Correcoes de idempotencia e encerramento automatico das recorrencias.

create or replace function public.materialize_my_recurrences()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rule public.recurrence_rules;
  v_template public.commitments;
  v_today date;
  v_horizon date;
  v_end date;
  v_occurrence date;
  v_pref_months integer;
  v_limit integer;
  v_existing integer;
  v_added integer;
  v_index integer;
  v_total_inserted integer := 0;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
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

  for v_rule in
    select *
      from public.recurrence_rules
     where user_id = v_user_id
       and active = true
  loop
    select *
      into v_template
      from public.commitments
     where recurrence_rule_id = v_rule.id
       and user_id = v_user_id
     order by occurrence_on asc
     limit 1;

    if not found then
      continue;
    end if;

    v_end := case
      when v_rule.ends_on is null then v_horizon
      else v_rule.ends_on
    end;

    v_limit := least(coalesce(v_rule.max_occurrences, 120), 120);

    select count(*)
      into v_existing
      from public.commitments
     where recurrence_rule_id = v_rule.id
       and user_id = v_user_id;

    if v_existing >= v_limit or v_end < v_today then
      update public.recurrence_rules
         set active = false,
             updated_at = now()
       where id = v_rule.id;
      continue;
    end if;

    v_added := 0;

    for v_index in 0..119 loop
      exit when v_index >= v_limit;
      exit when v_existing + v_added >= v_limit;

      v_occurrence := public.recurrence_occurrence_date(
        v_rule.anchor_date,
        v_rule.frequency,
        v_rule.interval_count,
        v_index,
        v_rule.day_of_month
      );

      if v_occurrence > coalesce(v_rule.materialized_until, v_today)
         and v_occurrence >= v_today
         and v_occurrence <= v_end then

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
          v_template.account_id,
          v_template.category_id,
          v_template.kind,
          'planned'::public.commitment_status,
          v_template.amount_cents,
          v_occurrence,
          v_template.description,
          v_rule.id,
          v_occurrence
        )
        on conflict (user_id, recurrence_rule_id, occurrence_on) do nothing;

        if found then
          v_added := v_added + 1;
          v_total_inserted := v_total_inserted + 1;
        end if;
      end if;
    end loop;

    update public.recurrence_rules
       set materialized_until = (
         select max(c.occurrence_on)
           from public.commitments c
          where c.recurrence_rule_id = v_rule.id
            and c.user_id = v_user_id
       ),
           active = case
             when v_rule.ends_on is not null and v_rule.ends_on <= v_horizon then false
             when v_rule.max_occurrences is not null
                  and v_existing + v_added >= v_rule.max_occurrences then false
             else true
           end,
           updated_at = now()
     where id = v_rule.id;
  end loop;

  return v_total_inserted;
end;
$$;

revoke all on function public.materialize_my_recurrences() from public;
grant execute on function public.materialize_my_recurrences() to authenticated;

notify pgrst, 'reload schema';
