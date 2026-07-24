import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Sparkles, UploadCloud } from "lucide-react";
import { useCategories } from "../categories/useCategories";
import { useHousehold } from "../household/useHousehold";
import { TransactionCategoryPicker } from "../merchantRules/TransactionCategoryPicker";
import { Button } from "../../shared/components/Button";
import { EmptyState } from "../../shared/components/EmptyState";
import { LoadingScreen } from "../../shared/components/LoadingScreen";
import { formatKrw, formatPercent } from "../../lib/format";
import { MetricCard } from "./MetricCard";
import type { Transaction } from "../../shared/types";
import { useDashboardData, type ChartDatum } from "./useDashboardData";

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
        title="대시보드를 불러오지 못했어요"
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
  const recentTransactions = data.currentMonthTransactions
    .filter((transaction) => !isCardIssuerDiscount(transaction))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-7">
      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-mint">
              <Sparkles className="h-4 w-4 text-lavender" aria-hidden />
              이번 달
            </p>
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
              <p className="mt-1 text-xl font-bold">
                {formatKrw(metrics.actualSpending)} / {formatKrw(metrics.targetAmount)}
              </p>
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
        <MetricCard label="고정비" value={formatKrw(metrics.fixedExpenses, true)} />
        <MetricCard label="변동비" value={formatKrw(metrics.variableExpenses, true)} />
        <MetricCard
          label="남은 예산"
          value={formatKrw(metrics.remainingBudget, true)}
          tone={metrics.remainingBudget >= 0 ? "good" : "bad"}
        />
        <MetricCard label="주택대출 반영 후" value={formatKrw(metrics.cashAfterLoans, true)} tone={metrics.cashAfterLoans >= 0 ? "good" : "bad"} />
      </section>

      <InstallmentForecast forecast={data.installmentForecast} />

      <Suspense fallback={<div className="fairy-card rounded-lg border p-4 text-sm text-stone-500">차트를 불러오는 중</div>}>
        <DashboardCharts
          trend={data.trend}
          categoryBreakdown={data.categoryBreakdown}
          topMerchants={data.topMerchants}
          topCategories={data.topCategories}
          installmentTrend={data.installmentTrend}
        />
      </Suspense>

      <section>
        <div className="mb-3">
          <h3 className="text-lg font-bold tracking-normal">가맹점 규칙 학습</h3>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            카테고리를 바꾸면 같은 가맹점은 다음 가져오기부터 자동 적용됩니다.
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


function isCardIssuerDiscount(transaction: Transaction) {
  const merchantText = `${transaction.merchant_raw} ${transaction.merchant_normalized}`.toLowerCase();
  return merchantText.includes("zero") && merchantText.includes("할인");
}

function InstallmentForecast({ forecast }: { forecast: ChartDatum[] }) {
  const baseMonth = forecast[0]?.name ? formatForecastMonth(forecast[0].name) : "이번 달";

  return (
    <section className="fairy-card rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-lavender/15 text-lavender">
          <CalendarClock className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">할부 예정 금액</p>
          <h3 className="mt-1 text-lg font-bold tracking-normal">{baseMonth} 기준 3개월 할부 흐름</h3>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            현재 명세서의 할부 회차와 잔액을 기준으로 이번 달부터 다음 두 달까지의 부담을 나눠 봅니다.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {forecast.map((datum) => (
          <article key={datum.name} className="rounded-lg border border-lavender/20 bg-white/65 p-3 dark:bg-neutral-950/65">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">{formatForecastMonth(datum.name)}</p>
            <p className="mt-2 break-words text-base font-black tracking-normal text-ink dark:text-stone-50">
              {formatKrw(datum.amount, true)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatForecastMonth(name: string) {
  const month = name.includes(".") ? name.split(".")[1] : name.slice(5, 7);
  const parsed = Number(month);
  return Number.isFinite(parsed) && parsed > 0 ? `${parsed}월` : name;
}
