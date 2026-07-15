import { useQuery } from "@tanstack/react-query";
import { addMonths, monthLabel, startOfMonth, toMonthKey } from "../../lib/dates";
import { supabase } from "../../lib/supabase";
import type { Goal, HomeLoanPayment, MonthlyIncome, Transaction } from "../../shared/types";

export type ChartDatum = {
  name: string;
  amount: number;
  color?: string;
};

export type DashboardMetrics = {
  totalCardBill: number;
  actualSpending: number;
  installmentAmount: number;
  fixedExpenses: number;
  variableExpenses: number;
  remainingBudget: number;
  targetProgress: number;
  monthlyScore: number;
  targetAmount: number;
  previousMonthSpending: number;
  monthlyAverage: number;
  futureInstallmentTotal: number;
  incomeTotal: number;
  husbandIncome: number;
  wifeIncome: number;
  homeLoanPaymentAmount: number;
  cashAfterSpending: number;
  cashAfterLoans: number;
};

export type DashboardData = {
  metrics: DashboardMetrics;
  transactions: Transaction[];
  currentMonthTransactions: Transaction[];
  trend: ChartDatum[];
  categoryBreakdown: ChartDatum[];
  topMerchants: ChartDatum[];
  topCategories: ChartDatum[];
  installmentTrend: ChartDatum[];
  coffeeTrend: ChartDatum[];
  coupangTrend: ChartDatum[];
  installmentForecast: ChartDatum[];
  income: MonthlyIncome | null;
  homeLoanPayments: HomeLoanPayment[];
  goal: Goal | null;
};

type TransactionRow = Omit<Transaction, "amount" | "installment_months" | "statement_period_month"> & {
  amount: string | number;
  installment_months: string | number;
  categories?: Transaction["categories"] | Transaction["categories"][];
  statements?: { period_month: string } | { period_month: string }[] | null;
};

type GoalRow = Omit<Goal, "target_amount"> & {
  target_amount: string | number;
};

type MonthlyIncomeRow = Omit<MonthlyIncome, "amount" | "husband_amount" | "wife_amount"> & {
  amount: string | number;
  husband_amount: string | number;
  wife_amount: string | number;
};

type HomeLoanPaymentRow = Omit<HomeLoanPayment, "amount"> & {
  amount: string | number;
};

type DashboardCashflow = {
  income: MonthlyIncome | null;
  homeLoanPayments: HomeLoanPayment[];
};

export function useDashboardData(householdId?: string) {
  return useQuery({
    queryKey: ["dashboard", householdId],
    enabled: Boolean(householdId),
    queryFn: async (): Promise<DashboardData> => {
      if (!householdId) {
        throw new Error("Household is required");
      }

      const currentMonth = startOfMonth(new Date());
      const since = `${toMonthKey(addMonths(currentMonth, -11))}-01`;

      const [transactionRows, goalResult, cashflow] = await Promise.all([
        fetchDashboardTransactions(householdId, since),
        supabase
          .from("goals")
          .select("id,household_id,goal_key,target_amount,starts_on,ends_on")
          .eq("household_id", householdId)
          .eq("goal_key", "monthly_living_expense")
          .order("starts_on", { ascending: false })
          .limit(1)
          .maybeSingle(),
        fetchDashboardCashflow(householdId, currentMonth),
      ]);

      if (goalResult.error) {
        throw goalResult.error;
      }

      const transactions = normalizeTransactions(transactionRows);
      const goal = goalResult.data ? normalizeGoal(goalResult.data as GoalRow) : null;

      return buildDashboardData(transactions, goal, currentMonth, cashflow);
    },
  });
}

function buildDashboardData(transactions: Transaction[], goal: Goal | null, currentMonth: Date, cashflow: DashboardCashflow): DashboardData {
  const currentMonthKey = toMonthKey(currentMonth);
  const currentMonthTransactions = transactions.filter((transaction) => getTransactionMonthKey(transaction) === currentMonthKey);
  const previousMonth = addMonths(currentMonth, -1);
  const previousMonthKey = toMonthKey(previousMonth);
  const previousMonthTransactions = transactions.filter((transaction) => getTransactionMonthKey(transaction) === previousMonthKey);
  const targetAmount = goal?.target_amount ?? 2_000_000;

  const totalCardBill = sumAmount(currentMonthTransactions);
  const actualSpending = sumAmount(currentMonthTransactions.filter((transaction) => !transaction.special_flag));
  const installmentAmount = sumAmount(currentMonthTransactions.filter((transaction) => transaction.installment_months > 1));
  const fixedExpenses = sumAmount(currentMonthTransactions.filter((transaction) => transaction.is_fixed && !transaction.special_flag));
  const variableExpenses = Math.max(actualSpending - fixedExpenses, 0);
  const previousMonthSpending = sumAmount(previousMonthTransactions.filter((transaction) => !transaction.special_flag));
  const monthlyAverage = averageMonthlySpending(transactions, currentMonth);
  const installmentForecast = buildInstallmentForecast(currentMonthTransactions, currentMonth);
  const futureInstallmentTotal = installmentForecast.reduce((sum, datum) => sum + datum.amount, 0);
  const husbandIncome = cashflow.income?.husband_amount ?? 0;
  const wifeIncome = cashflow.income?.wife_amount ?? 0;
  const incomeTotal = husbandIncome + wifeIncome;
  const homeLoanPaymentAmount = cashflow.homeLoanPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const cashAfterSpending = incomeTotal - actualSpending;
  const cashAfterLoans = cashAfterSpending - homeLoanPaymentAmount;
  const remainingBudget = targetAmount - actualSpending;
  const targetProgress = targetAmount > 0 ? actualSpending / targetAmount : 0;
  const monthlyScore = calculateMonthlyScore({
    actualSpending,
    targetAmount,
    previousMonthSpending,
    currentCount: currentMonthTransactions.length,
  });

  return {
    metrics: {
      totalCardBill,
      actualSpending,
      installmentAmount,
      fixedExpenses,
      variableExpenses,
      remainingBudget,
      targetProgress,
      monthlyScore,
      targetAmount,
      previousMonthSpending,
      monthlyAverage,
      futureInstallmentTotal,
      incomeTotal,
      husbandIncome,
      wifeIncome,
      homeLoanPaymentAmount,
      cashAfterSpending,
      cashAfterLoans,
    },
    transactions,
    currentMonthTransactions,
    trend: aggregateMonthly(transactions, currentMonth, (transaction) => !transaction.special_flag),
    categoryBreakdown: aggregateByCategory(currentMonthTransactions.filter((transaction) => !transaction.special_flag)),
    topMerchants: aggregateByMerchant(currentMonthTransactions).slice(0, 5),
    topCategories: aggregateByCategory(currentMonthTransactions).slice(0, 5),
    installmentTrend: aggregateMonthly(transactions, currentMonth, (transaction) => transaction.installment_months > 1),
    coffeeTrend: aggregateMonthly(transactions, currentMonth, isCoffeeTransaction),
    coupangTrend: aggregateMonthly(transactions, currentMonth, isCoupangTransaction),
    installmentForecast,
    income: cashflow.income,
    homeLoanPayments: cashflow.homeLoanPayments,
    goal,
  };
}


async function fetchDashboardTransactions(householdId: string, since: string): Promise<TransactionRow[]> {
  const baseSelect =
    "id,household_id,statement_id,transaction_date,merchant_raw,merchant_normalized,amount,payment_type,installment_months,approval_number,category_id,special_flag,is_fixed,categories(id,name,color,icon),statements!inner(period_month)";
  const installmentSelect =
    "id,household_id,statement_id,transaction_date,merchant_raw,merchant_normalized,amount,payment_type,installment_months,installment_current_round,installment_remaining_amount,approval_number,category_id,special_flag,is_fixed,categories(id,name,color,icon),statements!inner(period_month)";

  const result = await supabase
    .from("transactions")
    .select(installmentSelect)
    .eq("household_id", householdId)
    .gte("statements.period_month", since)
    .order("transaction_date", { ascending: false });

  if (!result.error) {
    return (result.data ?? []) as unknown as TransactionRow[];
  }

  if (!isMissingInstallmentColumnError(result.error.message)) {
    throw result.error;
  }

  const fallback = await supabase
    .from("transactions")
    .select(baseSelect)
    .eq("household_id", householdId)
    .gte("statements.period_month", since)
    .order("transaction_date", { ascending: false });

  if (fallback.error) {
    throw fallback.error;
  }

  return (fallback.data ?? []) as unknown as TransactionRow[];
}

function isMissingInstallmentColumnError(message: string) {
  return message.includes("installment_current_round") || message.includes("installment_remaining_amount");
}
function normalizeTransactions(rows: TransactionRow[]): Transaction[] {
  return rows.map((row) => {
    const { categories, statements, ...transaction } = row;

    return {
      ...transaction,
      amount: Number(row.amount),
      installment_months: Number(row.installment_months),
      statement_period_month: normalizeStatementPeriodMonth(statements),
      categories: Array.isArray(categories) ? (categories[0] ?? null) : (categories ?? null),
    };
  });
}

function normalizeStatementPeriodMonth(statements: TransactionRow["statements"]) {
  if (Array.isArray(statements)) {
    return statements[0]?.period_month ?? null;
  }

  return statements?.period_month ?? null;
}

export function getTransactionMonthKey(transaction: Transaction) {
  return transaction.statement_period_month ? toMonthKey(transaction.statement_period_month) : toMonthKey(transaction.transaction_date);
}

function normalizeGoal(row: GoalRow): Goal {
  return {
    ...row,
    target_amount: Number(row.target_amount),
  };
}

function sumAmount(transactions: Transaction[]) {
  return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
}

function aggregateMonthly(transactions: Transaction[], currentMonth: Date, predicate: (transaction: Transaction) => boolean) {
  const months = Array.from({ length: 6 }, (_, index) => toMonthKey(addMonths(currentMonth, index - 5)));
  const amounts = new Map(months.map((month) => [month, 0]));

  transactions.filter(predicate).forEach((transaction) => {
    const month = getTransactionMonthKey(transaction);
    if (amounts.has(month)) {
      amounts.set(month, (amounts.get(month) ?? 0) + transaction.amount);
    }
  });

  return months.map((month) => ({
    name: monthLabel(month),
    amount: amounts.get(month) ?? 0,
  }));
}

function aggregateByCategory(transactions: Transaction[]) {
  const map = new Map<string, ChartDatum>();

  transactions.forEach((transaction) => {
    const name = transaction.categories?.name ?? "Other";
    const color = transaction.categories?.color ?? "#71717A";
    const current = map.get(name) ?? { name, amount: 0, color };
    current.amount += transaction.amount;
    map.set(name, current);
  });

  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function aggregateByMerchant(transactions: Transaction[]) {
  const map = new Map<string, ChartDatum>();

  transactions.forEach((transaction) => {
    const name = transaction.merchant_normalized;
    const current = map.get(name) ?? { name, amount: 0 };
    current.amount += transaction.amount;
    map.set(name, current);
  });

  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function averageMonthlySpending(transactions: Transaction[], currentMonth: Date) {
  const totals = aggregateMonthly(transactions, currentMonth, (transaction) => !transaction.special_flag);

  const nonZero = totals.filter((datum) => datum.amount > 0);
  if (nonZero.length === 0) {
    return 0;
  }

  return nonZero.reduce((sum, datum) => sum + datum.amount, 0) / nonZero.length;
}

function calculateMonthlyScore(input: {
  actualSpending: number;
  targetAmount: number;
  previousMonthSpending: number;
  currentCount: number;
}) {
  if (input.currentCount === 0) {
    return 0;
  }

  const targetOverrun = Math.max(input.actualSpending - input.targetAmount, 0) / Math.max(input.targetAmount, 1);
  const previousIncrease =
    input.previousMonthSpending > 0
      ? Math.max(input.actualSpending - input.previousMonthSpending, 0) / input.previousMonthSpending
      : 0;

  return Math.max(0, Math.min(100, Math.round(100 - targetOverrun * 70 - previousIncrease * 20)));
}

function isCoffeeTransaction(transaction: Transaction) {
  const merchant = transaction.merchant_normalized.toLowerCase();
  return (
    transaction.categories?.name === "Cafe" ||
    ["coffee", "커피", "starbucks", "스타벅스", "compose", "컴포즈", "ediya", "이디야"].some((keyword) =>
      merchant.includes(keyword.toLowerCase()),
    )
  );
}

function isCoupangTransaction(transaction: Transaction) {
  const merchant = transaction.merchant_normalized.toLowerCase();
  return ["coupang", "쿠팡"].some((keyword) => merchant.includes(keyword.toLowerCase()));
}
async function fetchDashboardCashflow(householdId: string, currentMonth: Date): Promise<DashboardCashflow> {
  const month = `${toMonthKey(currentMonth)}-01`;

  const [incomeResult, loanResult] = await Promise.all([
    supabase
      .from("monthly_income")
      .select("id,household_id,month,amount,husband_amount,wife_amount,notes")
      .eq("household_id", householdId)
      .eq("month", month)
      .maybeSingle(),
    supabase
      .from("home_loan_payments")
      .select("id,household_id,month,label,amount,notes")
      .eq("household_id", householdId)
      .eq("month", month),
  ]);

  if (incomeResult.error || loanResult.error) {
    return { income: null, homeLoanPayments: [] };
  }

  return {
    income: incomeResult.data ? normalizeIncome(incomeResult.data as MonthlyIncomeRow) : null,
    homeLoanPayments: ((loanResult.data ?? []) as HomeLoanPaymentRow[]).map(normalizeHomeLoanPayment),
  };
}

function normalizeIncome(row: MonthlyIncomeRow): MonthlyIncome {
  return {
    ...row,
    amount: Number(row.amount),
    husband_amount: Number(row.husband_amount),
    wife_amount: Number(row.wife_amount),
  };
}

function normalizeHomeLoanPayment(row: HomeLoanPaymentRow): HomeLoanPayment {
  return {
    ...row,
    amount: Number(row.amount),
  };
}

function buildInstallmentForecast(currentMonthTransactions: Transaction[], currentMonth: Date) {
  const months = [0, 1, 2].map((offset) => toMonthKey(addMonths(currentMonth, offset)));
  const amounts = new Map(months.map((month) => [month, 0]));

  currentMonthTransactions
    .filter((transaction) => transaction.installment_months > 1)
    .forEach((transaction) => {
      let remainingAmount = transaction.installment_remaining_amount;
      const currentRound = transaction.installment_current_round ?? 1;

      months.forEach((month, index) => {
        if (index === 0) {
          amounts.set(month, (amounts.get(month) ?? 0) + transaction.amount);
          return;
        }

        const nextInstallmentNumber = currentRound + index;
        if (nextInstallmentNumber > transaction.installment_months) {
          return;
        }

        const forecastAmount =
          remainingAmount !== null
            ? Math.min(transaction.amount, Math.max(remainingAmount, 0))
            : transaction.amount;

        if (forecastAmount <= 0) {
          return;
        }

        amounts.set(month, (amounts.get(month) ?? 0) + forecastAmount);
        if (remainingAmount !== null) {
          remainingAmount = Math.max(remainingAmount - forecastAmount, 0);
        }
      });
    });

  return months.map((month) => ({
    name: monthLabel(month),
    amount: amounts.get(month) ?? 0,
  }));
}
