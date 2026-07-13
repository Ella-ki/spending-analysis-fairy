import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toIsoDate } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import type { HomeLoanPayment, MonthlyIncome } from "../../shared/types";

export type CashflowData = {
  month: string;
  income: MonthlyIncome | null;
  loanPayments: HomeLoanPayment[];
};

type IncomeRow = Omit<MonthlyIncome, "amount" | "husband_amount" | "wife_amount"> & {
  amount: string | number;
  husband_amount: string | number;
  wife_amount: string | number;
};

type LoanPaymentRow = Omit<HomeLoanPayment, "amount"> & {
  amount: string | number;
};

export type CashflowSaveInput = {
  householdId: string;
  month: Date;
  husbandAmount: number;
  wifeAmount: number;
  loanLabel: string;
  loanAmount: number;
  notes?: string;
};

export function useCashflowData(householdId?: string, month = new Date()) {
  const monthDate = toIsoDate(new Date(month.getFullYear(), month.getMonth(), 1));

  return useQuery({
    queryKey: ["cashflow", householdId, monthDate],
    enabled: Boolean(householdId),
    queryFn: async (): Promise<CashflowData> => {
      if (!householdId) {
        throw new Error("Household is required");
      }

      const [incomeResult, loanResult] = await Promise.all([
        supabase
          .from("monthly_income")
          .select("id,household_id,month,amount,husband_amount,wife_amount,notes")
          .eq("household_id", householdId)
          .eq("month", monthDate)
          .maybeSingle(),
        supabase
          .from("home_loan_payments")
          .select("id,household_id,month,label,amount,notes")
          .eq("household_id", householdId)
          .eq("month", monthDate)
          .order("label", { ascending: true }),
      ]);

      if (incomeResult.error) {
        throw incomeResult.error;
      }

      if (loanResult.error) {
        throw loanResult.error;
      }

      return {
        month: monthDate,
        income: incomeResult.data ? normalizeIncome(incomeResult.data as IncomeRow) : null,
        loanPayments: ((loanResult.data ?? []) as LoanPaymentRow[]).map(normalizeLoanPayment),
      };
    },
  });
}

export function useSaveCashflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CashflowSaveInput) => {
      const monthDate = toIsoDate(new Date(input.month.getFullYear(), input.month.getMonth(), 1));
      const husbandAmount = Math.max(input.husbandAmount, 0);
      const wifeAmount = Math.max(input.wifeAmount, 0);
      const loanAmount = Math.max(input.loanAmount, 0);
      const loanLabel = input.loanLabel.trim() || "주택 대출";

      const incomeResult = await supabase
        .from("monthly_income")
        .upsert(
          {
            household_id: input.householdId,
            month: monthDate,
            husband_amount: husbandAmount,
            wife_amount: wifeAmount,
            amount: husbandAmount + wifeAmount,
            notes: input.notes?.trim() || null,
          },
          { onConflict: "household_id,month" },
        );

      if (incomeResult.error) {
        throw incomeResult.error;
      }

      const loanResult = await supabase
        .from("home_loan_payments")
        .upsert(
          {
            household_id: input.householdId,
            month: monthDate,
            label: loanLabel,
            amount: loanAmount,
            notes: input.notes?.trim() || null,
          },
          { onConflict: "household_id,month,label" },
        );

      if (loanResult.error) {
        throw loanResult.error;
      }

      return { householdId: input.householdId, monthDate };
    },
    onSuccess: async ({ householdId, monthDate }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cashflow", householdId, monthDate] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", householdId] }),
      ]);
    },
  });
}

function normalizeIncome(row: IncomeRow): MonthlyIncome {
  return {
    ...row,
    amount: Number(row.amount),
    husband_amount: Number(row.husband_amount),
    wife_amount: Number(row.wife_amount),
  };
}

function normalizeLoanPayment(row: LoanPaymentRow): HomeLoanPayment {
  return {
    ...row,
    amount: Number(row.amount),
  };
}