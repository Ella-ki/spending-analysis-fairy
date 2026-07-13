create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code uuid not null default gen_random_uuid(),
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(join_code)
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  relationship_role text not null check (relationship_role in ('husband', 'wife')),
  is_admin boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  name text not null,
  color text not null default '#2F8F6B',
  icon text not null default 'circle',
  is_default boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table public.statements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  source_card_company text not null default 'hyundai',
  period_month date not null,
  original_file_name text not null,
  storage_path text,
  checksum text not null,
  row_count integer not null default 0,
  total_amount numeric(14, 2) not null default 0,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (household_id, checksum)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  statement_id uuid references public.statements(id) on delete set null,
  imported_by uuid not null references public.users(id) on delete restrict,
  transaction_date date not null,
  merchant_raw text not null,
  merchant_normalized text not null,
  amount numeric(14, 2) not null,
  payment_type text,
  installment_months integer not null default 1 check (installment_months >= 1),
  approval_number text,
  category_id uuid references public.categories(id) on delete set null,
  special_flag text check (special_flag in ('travel', 'wedding', 'hospital', 'moving', 'furniture')),
  is_fixed boolean not null default false,
  source_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, source_hash)
);

create index transactions_household_date_idx on public.transactions (household_id, transaction_date desc);
create index transactions_household_merchant_idx on public.transactions (household_id, merchant_normalized);
create index transactions_statement_idx on public.transactions (statement_id);

create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  merchant_pattern text not null,
  merchant_normalized text not null,
  category_id uuid references public.categories(id) on delete set null,
  special_flag text check (special_flag in ('travel', 'wedding', 'hospital', 'moving', 'furniture')),
  is_fixed boolean not null default false,
  confidence numeric(4, 3) not null default 1.000 check (confidence >= 0 and confidence <= 1),
  learned_from_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, merchant_normalized)
);

create table public.monthly_income (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  month date not null,
  amount numeric(14, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, month)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  goal_key text not null default 'monthly_living_expense',
  target_amount numeric(14, 2) not null default 2000000,
  starts_on date not null default date_trunc('month', now())::date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, goal_key, starts_on)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

create trigger households_touch_updated_at
before update on public.households
for each row execute function public.touch_updated_at();

create trigger transactions_touch_updated_at
before update on public.transactions
for each row execute function public.touch_updated_at();

create trigger merchant_rules_touch_updated_at
before update on public.merchant_rules
for each row execute function public.touch_updated_at();

create trigger monthly_income_touch_updated_at
before update on public.monthly_income
for each row execute function public.touch_updated_at();

create trigger goals_touch_updated_at
before update on public.goals
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1)), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.users.display_name, excluded.display_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update on auth.users
for each row execute function public.handle_new_user();

create or replace function public.ensure_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.users (id, email, display_name)
  values (
    auth.uid(),
    coalesce(auth.jwt()->>'email', ''),
    nullif(coalesce(auth.jwt()->>'name', split_part(coalesce(auth.jwt()->>'email', ''), '@', 1)), '')
  )
  on conflict (id) do update
    set email = coalesce(excluded.email, public.users.email),
        display_name = coalesce(public.users.display_name, excluded.display_name),
        updated_at = now();
end;
$$;

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
  );
$$;

create or replace function public.is_household_admin(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.is_admin
  );
$$;

create or replace function public.create_household(household_name text, member_role text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if member_role not in ('husband', 'wife') then
    raise exception 'Invalid household role';
  end if;

  perform public.ensure_current_user();

  insert into public.households (name, created_by)
  values (coalesce(nullif(trim(household_name), ''), '우리집'), auth.uid())
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, relationship_role, is_admin)
  values (new_household_id, auth.uid(), member_role, true);

  insert into public.goals (household_id, target_amount)
  values (new_household_id, 2000000);

  return new_household_id;
end;
$$;

create or replace function public.join_household_by_code(invite_code uuid, member_role text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if member_role not in ('husband', 'wife') then
    raise exception 'Invalid household role';
  end if;

  perform public.ensure_current_user();

  select id
    into target_household_id
    from public.households
   where join_code = invite_code;

  if target_household_id is null then
    raise exception 'Household code not found';
  end if;

  insert into public.household_members (household_id, user_id, relationship_role, is_admin)
  values (target_household_id, auth.uid(), member_role, false)
  on conflict (household_id, user_id) do update
    set relationship_role = excluded.relationship_role;

  return target_household_id;
end;
$$;

grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household_by_code(uuid, text) to authenticated;
grant execute on function public.ensure_current_user() to authenticated;

alter table public.users enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.statements enable row level security;
alter table public.transactions enable row level security;
alter table public.merchant_rules enable row level security;
alter table public.monthly_income enable row level security;
alter table public.goals enable row level security;

create policy users_read_own on public.users
for select to authenticated
using (id = auth.uid());

create policy users_update_own on public.users
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy households_read_member on public.households
for select to authenticated
using (public.is_household_member(id));

create policy households_update_admin on public.households
for update to authenticated
using (public.is_household_admin(id))
with check (public.is_household_admin(id));

create policy household_members_read_household on public.household_members
for select to authenticated
using (public.is_household_member(household_id));

create policy household_members_update_admin on public.household_members
for update to authenticated
using (public.is_household_admin(household_id))
with check (public.is_household_admin(household_id));

create policy categories_read_global_or_member on public.categories
for select to authenticated
using (household_id is null or public.is_household_member(household_id));

create policy categories_write_member on public.categories
for all to authenticated
using (household_id is not null and public.is_household_member(household_id))
with check (household_id is not null and public.is_household_member(household_id));

create policy statements_read_member on public.statements
for select to authenticated
using (public.is_household_member(household_id));

create policy statements_insert_member on public.statements
for insert to authenticated
with check (uploaded_by = auth.uid() and public.is_household_member(household_id));

create policy statements_update_member on public.statements
for update to authenticated
using (uploaded_by = auth.uid() and public.is_household_member(household_id))
with check (uploaded_by = auth.uid() and public.is_household_member(household_id));

create policy transactions_read_member on public.transactions
for select to authenticated
using (public.is_household_member(household_id));

create policy transactions_insert_member on public.transactions
for insert to authenticated
with check (imported_by = auth.uid() and public.is_household_member(household_id));

create policy transactions_update_member on public.transactions
for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy merchant_rules_read_member on public.merchant_rules
for select to authenticated
using (public.is_household_member(household_id));

create policy merchant_rules_write_member on public.merchant_rules
for all to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy monthly_income_read_member on public.monthly_income
for select to authenticated
using (public.is_household_member(household_id));

create policy monthly_income_write_member on public.monthly_income
for all to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy goals_read_member on public.goals
for select to authenticated
using (public.is_household_member(household_id));

create policy goals_write_member on public.goals
for all to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

insert into public.categories (name, color, icon, is_default, sort_order)
values
  ('Food', '#E56B5D', 'utensils', true, 10),
  ('Cafe', '#8B5E3C', 'coffee', true, 20),
  ('Groceries', '#2F8F6B', 'shopping-basket', true, 30),
  ('Shopping', '#4D8BC8', 'shopping-bag', true, 40),
  ('Transportation', '#6B7280', 'train', true, 50),
  ('Hospital', '#DD6B8E', 'heart-pulse', true, 60),
  ('Running', '#22A06B', 'footprints', true, 70),
  ('Subscriptions', '#7C5CFC', 'repeat', true, 80),
  ('Travel', '#D7A83F', 'plane', true, 90),
  ('Utilities', '#0891B2', 'bolt', true, 100),
  ('Insurance', '#64748B', 'shield', true, 110),
  ('Other', '#71717A', 'circle', true, 999)
on conflict do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'statements',
  'statements',
  false,
  10485760,
  array['text/csv', 'text/plain', 'text/html', 'application/vnd.ms-excel', 'application/csv']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy statement_files_select on storage.objects
for select to authenticated
using (
  bucket_id = 'statements'
  and public.is_household_member(split_part(name, '/', 1)::uuid)
);

create policy statement_files_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'statements'
  and public.is_household_member(split_part(name, '/', 1)::uuid)
);

create policy statement_files_update on storage.objects
for update to authenticated
using (
  bucket_id = 'statements'
  and public.is_household_member(split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'statements'
  and public.is_household_member(split_part(name, '/', 1)::uuid)
);
