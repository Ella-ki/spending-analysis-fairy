alter table public.home_loan_payments
  add column if not exists bank_name text not null default '우리은행',
  add column if not exists loan_account_mask text,
  add column if not exists balance_amount numeric(14, 2),
  add column if not exists due_date date,
  add column if not exists principal_amount numeric(14, 2),
  add column if not exists interest_amount numeric(14, 2);

notify pgrst, 'reload schema';
