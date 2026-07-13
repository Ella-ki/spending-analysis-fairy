import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Category, Transaction } from "../../shared/types";
import { learnMerchantRule } from "./learnMerchantRule";

type TransactionCategoryPickerProps = {
  transaction: Transaction;
  categories: Category[];
};

export function TransactionCategoryPicker({ transaction, categories }: TransactionCategoryPickerProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (categoryId: string | null) =>
      learnMerchantRule({
        householdId: transaction.household_id,
        transactionId: transaction.id,
        merchantNormalized: transaction.merchant_normalized,
        categoryId,
        isFixed: transaction.is_fixed,
        specialFlag: transaction.special_flag,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", transaction.household_id] }),
        queryClient.invalidateQueries({ queryKey: ["transactions", transaction.household_id] }),
      ]);
    },
  });

  return (
    <select
      value={transaction.category_id ?? ""}
      disabled={mutation.isPending}
      onChange={(event) => mutation.mutate(event.target.value || null)}
      className="min-h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-semibold text-ink outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-stone-50"
      aria-label={`${transaction.merchant_normalized} category`}
    >
      <option value="">Uncategorized</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}
