import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { UploadCloud } from "lucide-react";
import { useCategories } from "../categories/useCategories";
import { useHousehold } from "../household/useHousehold";
import { TransactionCategoryPicker } from "../merchantRules/TransactionCategoryPicker";
import { Button } from "../../shared/components/Button";
import { EmptyState } from "../../shared/components/EmptyState";
import { LoadingScreen } from "../../shared/components/LoadingScreen";
import { formatKrw, formatPercent } from "../../lib/format";
import { MetricCard } from "./MetricCard";
import { useDashboardData } from "./useDashboardData";

const DashboardCharts = lazy(() => import("./DashboardCharts").then((module) => ({ default: module.DashboardCharts })));

export function DashboardPage() {
  const { membership } = useHousehold();
  const householdId = membership?.household.id;
  const dashboardQuery = useDashboardData(householdId);
  const categoriesQuery = useCategories(householdId);

  if (dashboardQuery.isLoading) {
    return <LoadingScreen label="대시보드를 계산하고 있어요" />;
  }

  if (dashboardQuery.error) {
    return (
      <EmptyState
        title="대시보드를 불러오지 못했습니다"
        description={dashboardQuery.error.message}
        action={
          <Button type="button" onClick={() => dashboardQuery.refetch()}>
            다시 시도
          </Button>
        }
      />
    );
  }

  const data = dashboardQuery.data;

  if (!data || data.transactions.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <section>
          <p className="text-sm font-semibold text-mint">Current Month</p>
          <h2 className="mt-1 text-3xl font-bold tracking-normal">첫 CSV를 올리면 카드값 흐름이 바로 보입니다.</h2>
        </section>
        <EmptyState
          title="아직 거래 데이터가 없습니다"
          description="현대카드 CSV를 업로드하면 총 카드값, 실제 소비, 할부, 고정비, 변동비, 예산 진행률이 자동 계산됩니다."
          action={
            <Link
              to="/upload"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white dark:bg-stone-50 dark:text-ink"
            >
              CSV 업로드
            </Link>
          }
        />
      </div>
    );
  }

  const metrics = data.metrics;
  const categories = categoriesQuery.data ?? [];
  const recentTransactions = data.currentMonthTransactions.slice(0, 8);

  return (
    <div className="flex flex-col gap-7">
      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-mint">Current Month</p>
            <h2 className="mt-1 text-3xl font-bold tracking-normal">이번 달 소비 상태</h2>
          </div>
          <Link
            to="/upload"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-ink px-3 text-sm font-semibold text-white dark:bg-stone-50 dark:text-ink"
          >
            <UploadCloud className="h-5 w-5" aria-hidden />
            CSV
          </Link>
        </div>

        <div className="mt-5 rounded-lg border border-stone-200 bg-white p-4 shadow-soft dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Target progress</p>
              <p className="mt-1 text-xl font-bold">{formatKrw(metrics.actualSpending)} / {formatKrw(metrics.targetAmount)}</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-xl font-bold text-white dark:bg-stone-50 dark:text-ink">
              {metrics.monthlyScore}
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-200 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full ${metrics.targetProgress <= 1 ? "bg-mint" : "bg-coral"}`}
              style={{ width: `${Math.min(metrics.targetProgress, 1.25) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            생활비 목표 대비 {formatPercent(metrics.targetProgress)} 사용
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MetricCard label="Total Card Bill" value={formatKrw(metrics.totalCardBill, true)} />
        <MetricCard label="Actual Spending" value={formatKrw(metrics.actualSpending, true)} tone={metrics.remainingBudget >= 0 ? "good" : "bad"} />
        <MetricCard label="Installment Amount" value={formatKrw(metrics.installmentAmount, true)} />
        <MetricCard label="Fixed Expenses" value={formatKrw(metrics.fixedExpenses, true)} />
        <MetricCard label="Variable Expenses" value={formatKrw(metrics.variableExpenses, true)} />
        <MetricCard
          label="Remaining Budget"
          value={formatKrw(metrics.remainingBudget, true)}
          tone={metrics.remainingBudget >= 0 ? "good" : "bad"}
        />
      </section>

      <Suspense fallback={<div className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-500 dark:border-neutral-800 dark:bg-neutral-900">차트를 불러오는 중</div>}>
        <DashboardCharts
          trend={data.trend}
          categoryBreakdown={data.categoryBreakdown}
          topMerchants={data.topMerchants}
          topCategories={data.topCategories}
          installmentTrend={data.installmentTrend}
          coffeeTrend={data.coffeeTrend}
          coupangTrend={data.coupangTrend}
        />
      </Suspense>

      <section>
        <div className="mb-3">
          <h3 className="text-lg font-bold tracking-normal">Merchant rule learning</h3>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            카테고리를 바꾸면 같은 가맹점의 다음 가져오기에 자동 적용됩니다.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {recentTransactions.map((transaction) => (
            <article key={transaction.id} className="rounded-lg border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{transaction.merchant_normalized}</p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {transaction.transaction_date} · {formatKrw(transaction.amount)}
                  </p>
                </div>
                <TransactionCategoryPicker transaction={transaction} categories={categories} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
