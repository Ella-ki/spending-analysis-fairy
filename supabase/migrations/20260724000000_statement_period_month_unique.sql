with ranked_statements as (
  select
    id,
    row_number() over (
      partition by household_id, period_month
      order by imported_at desc, created_at desc, id desc
    ) as duplicate_rank
  from public.statements
), duplicate_statements as (
  select id
  from ranked_statements
  where duplicate_rank > 1
)
delete from public.transactions t
using duplicate_statements d
where t.statement_id = d.id;

with ranked_statements as (
  select
    id,
    row_number() over (
      partition by household_id, period_month
      order by imported_at desc, created_at desc, id desc
    ) as duplicate_rank
  from public.statements
), duplicate_statements as (
  select id
  from ranked_statements
  where duplicate_rank > 1
)
delete from public.statements s
using duplicate_statements d
where s.id = d.id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'statements_household_period_month_key'
      and conrelid = 'public.statements'::regclass
  ) then
    alter table public.statements
      add constraint statements_household_period_month_key unique (household_id, period_month);
  end if;
end $$;

drop policy if exists statements_update_member on public.statements;

create policy statements_update_member on public.statements
for update to authenticated
using (public.is_household_member(household_id))
with check (uploaded_by = auth.uid() and public.is_household_member(household_id));

notify pgrst, 'reload schema';
