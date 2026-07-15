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

type LoanPaymentRow = Omit<
  HomeLoanPayment,
  "amount" | "balance_amount" | "principal_amount" | "interest_amount"
> & {
  amount: string | number;
  balance_amount: string | number | null;
  principal_amount: string | number | null;
  interest_amount: string | number | null;
};

export type CashflowSaveInput = {
  householdId: string;
  month: Date;
  husbandAmount: number;
  wifeAmount: number;
  bankName: string;
  loanLabel: string;
  loanAccountMask: string;
  loanBalanceAmount: number;
  loanDueDate: string;
  loanAmount: number;
  principalAmount: number;
  interestAmount: number;
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
          .select(
            "id,household_id,month,label,amount,bank_name,loan_account_mask,balance_amount,due_date,principal_amount,interest_amount,notes",
          )
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
      const principalAmount = Math.max(input.principalAmount, 0);
      const interestAmount = Math.max(input.interestAmount, 0);
      const loanLabel = input.loanLabel.trim() || "내집마련디딤돌대출(이차보전)";
      const bankName = input.bankName.trim() || "우리은행";
      const loanDueDate = input.loanDueDate || monthDate;

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
            bank_name: bankName,
            loan_account_mask: input.loanAccountMask.trim() || null,
            balance_amount: Math.max(input.loanBalanceAmount, 0),
            due_date: loanDueDate,
            principal_amount: principalAmount,
            interest_amount: interestAmount,
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
    balance_amount: row.balance_amount === null ? null : Number(row.balance_amount),
    principal_amount: row.principal_amount === null ? null : Number(row.principal_amount),
    interest_amount: row.interest_amount === null ? null : Number(row.interest_amount),
  };
}
