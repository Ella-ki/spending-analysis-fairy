import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Banknote, Sparkles, UploadCloud, WandSparkles } from "lucide-react";
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
          <p className="text-sm font-semibold text-mint">이번 달</p>
          <h2 className="mt-1 text-3xl font-bold tracking-normal">첫 XLS 명세서를 올리면 카드값 흐름이 바로 보입니다.</h2>
        </section>
        <EmptyState
          title="아직 거래 데이터가 없습니다"
          description="현대카드 XLS 명세서를 업로드하면 총 카드값, 실제 소비, 할부, 고정비, 변동비, 예산 진행률이 자동 계산됩니다."
          action={
            <Link
              to="/upload"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-to-br from-mint to-lavender px-4 py-2 text-sm font-semibold text-white shadow-fairy"
            >
              명세서 업로드
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
            <p className="flex items-center gap-2 text-sm font-semibold text-mint"><Sparkles className="h-4 w-4 text-lavender" aria-hidden />이번 달</p>
            <h2 className="mt-1 text-3xl font-bold tracking-normal">이번 달 소비 상태</h2>
          </div>
          <Link
            to="/upload"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-br from-mint to-lavender px-3 text-sm font-semibold text-white shadow-fairy"
          >
            <UploadCloud className="h-5 w-5" aria-hidden />
            XLS
          </Link>
        </div>

        <div className="fairy-card mt-5 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">목표 진행률</p>
              <p className="mt-1 text-xl font-bold">{formatKrw(metrics.actualSpending)} / {formatKrw(metrics.targetAmount)}</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold to-petal text-xl font-bold text-white shadow-fairy">
              {metrics.monthlyScore}
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-200 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full ${metrics.targetProgress <= 1 ? "bg-gradient-to-r from-mint to-lavender" : "bg-coral"}`}
              style={{ width: `${Math.min(metrics.targetProgress, 1.25) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            생활비 목표 대비 {formatPercent(metrics.targetProgress)} 사용
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MetricCard label="총 카드값" value={formatKrw(metrics.totalCardBill, true)} />
        <MetricCard label="실제 소비" value={formatKrw(metrics.actualSpending, true)} tone={metrics.remainingBudget >= 0 ? "good" : "bad"} />
        <MetricCard label="할부 금액" value={formatKrw(metrics.installmentAmount, true)} />
        <MetricCard label="고정비" value={formatKrw(metrics.fixedExpenses, true)} />
        <MetricCard label="변동비" value={formatKrw(metrics.variableExpenses, true)} />
        <MetricCard
          label="남은 예산"
          value={formatKrw(metrics.remainingBudget, true)}
          tone={metrics.remainingBudget >= 0 ? "good" : "bad"}
        />
      </section>

      <Suspense fallback={<div className="fairy-card rounded-lg border p-4 text-sm text-stone-500">차트를 불러오는 중</div>}>
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
          <h3 className="text-lg font-bold tracking-normal">가맹점 규칙 학습</h3>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            카테고리를 바꾸면 같은 가맹점의 다음 가져오기에 자동 적용됩니다.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {recentTransactions.map((transaction) => (
            <article key={transaction.id} className="fairy-card rounded-lg border p-4">
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
function buildAiInsights(data: NonNullable<ReturnType<typeof useDashboardData>["data"]>) {
  const metrics = data.metrics;
  const insights: string[] = [];

  if (metrics.incomeTotal > 0) {
    insights.push(
      `이번 달 월급 ${formatKrw(metrics.incomeTotal)} 중 카드 소비와 주택 대출을 반영하면 ${formatKrw(metrics.cashAfterLoans)}이 남는 흐름입니다.`,
    );
  } else {
    insights.push("월급 입금액을 입력하면 카드값과 주택 대출을 뺀 실제 잔여 현금을 계산할 수 있어요.");
  }

  if (metrics.futureInstallmentTotal > 0) {
    insights.push(`앞으로 3개월 안에 잡힌 할부 예정액은 ${formatKrw(metrics.futureInstallmentTotal)}입니다. 큰 지출 전에는 이 금액을 먼저 고정비처럼 보고 판단하는 편이 좋아요.`);
  } else {
    insights.push("현재 데이터 기준으로 다음 3개월 할부 부담은 크지 않습니다.");
  }

  if (metrics.targetProgress > 1) {
    insights.push(`생활비 목표를 ${formatPercent(metrics.targetProgress)} 사용했습니다. 다음 소비는 변동비보다 고정/대출 이후 잔액 기준으로 보는 게 안전합니다.`);
  } else {
    insights.push(`생활비 목표 대비 ${formatPercent(metrics.targetProgress)} 사용 중입니다. 아직 목표 안쪽에 있어요.`);
  }

  return insights;
}
