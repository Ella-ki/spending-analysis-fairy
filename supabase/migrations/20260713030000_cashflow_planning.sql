alter table public.monthly_income
  add column if not exists husband_amount numeric(14, 2) not null default 0,
  add column if not exists wife_amount numeric(14, 2) not null default 0;

update public.monthly_income
   set husband_amount = amount
 where husband_amount = 0
   and wife_amount = 0
   and amount <> 0;

alter table public.transactions
  add column if not exists installment_current_round integer,
  add column if not exists installment_remaining_amount numeric(14, 2);

create table if not exists public.home_loan_payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  month date not null,
  label text not null default '주택 대출',
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, month, label)
);

drop trigger if exists home_loan_payments_touch_updated_at on public.home_loan_payments;

create trigger home_loan_payments_touch_updated_at
before update on public.home_loan_payments
for each row execute function public.touch_updated_at();

alter table public.home_loan_payments enable row level security;

drop policy if exists home_loan_payments_read_member on public.home_loan_payments;

create policy home_loan_payments_read_member on public.home_loan_payments
for select to authenticated
using (public.is_household_member(household_id));

drop policy if exists home_loan_payments_write_member on public.home_loan_payments;

create policy home_loan_payments_write_member on public.home_loan_payments
for all to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));