drop policy if exists transactions_delete_member on public.transactions;

create policy transactions_delete_member on public.transactions
for delete to authenticated
using (public.is_household_member(household_id));