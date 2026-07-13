import { addMonths, toMonthKey } from "../../lib/dates";
import { formatKrw, signedKrw } from "../../lib/format";
import { EmptyState } from "../../shared/components/EmptyState";
import { LoadingScreen } from "../../shared/components/LoadingScreen";
import type { Transaction } from "../../shared/types";
import { useHousehold } from "../household/useHousehold";
import { MetricCard } from "../dashboard/MetricCard";
import { getTransactionMonthKey, useDashboardData } from "../dashboard/useDashboardData";

type DeltaRow = {
  name: string;
  current: number;
  previous: number;
  delta: number;
};

export function AnalysisPage() {
  const { membership } = useHousehold();
  const dashboardQuery = useDashboardData(membership?.household.id);

  if (dashboardQuery.isLoading) {
    return <LoadingScreen label="월간 분석을 계산하고 있어요" />;
  }

  if (dashboardQuery.error) {
    return <EmptyState title="월간 분석을 불러오지 못했습니다" description={dashboardQuery.error.message} />;
  }

  const data = dashboardQuery.data;

  if (!data || data.transactions.length === 0) {
    return <EmptyState title="분석할 거래가 없습니다" description="현대카드 XLS 명세서를 가져오면 월별 비교와 카테고리 변화를 계산합니다." />;
  }

  const previousMonthKey = toMonthKey(addMonths(new Date(), -1));
  const previousTransactions = data.transactions.filter((transaction) => getTransactionMonthKey(transaction) === previousMonthKey);
  const categoryDeltas = buildCategoryDeltas(data.currentMonthTransactions, previousTransactions).slice(0, 6);
  const topMerchant = data.topMerchants[0];
  const currentCoffee = data.coffeeTrend[data.coffeeTrend.length - 1]?.amount ?? 0;
  const previousCoffee = data.coffeeTrend[data.coffeeTrend.length - 2]?.amount ?? 0;
  const coffeeDelta = currentCoffee - previousCoffee;

  return (
    <div className="flex flex-col gap-7">
      <section>
        <p className="text-sm font-semibold text-mint">월간 분석</p>
        <h2 className="mt-1 text-3xl font-bold tracking-normal">이번 달 소비가 어떻게 달라졌는지.</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
          특별 지출은 실제 소비에서 제외하고, 명세서 월 기준으로 이전 달과 평균 대비 흐름을 빠르게 봅니다.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MetricCard label="이번 달" value={formatKrw(data.metrics.actualSpending, true)} />
        <MetricCard label="지난달" value={formatKrw(data.metrics.previousMonthSpending, true)} />
        <MetricCard label="평균" value={formatKrw(data.metrics.monthlyAverage, true)} />
        <MetricCard
          label="목표 대비"
          value={signedKrw(data.metrics.remainingBudget)}
          tone={data.metrics.remainingBudget >= 0 ? "good" : "bad"}
        />
      </section>

      <section className="grid gap-3">
        <AnalysisCard
          title="가장 많이 쓴 가맹점"
          body={topMerchant ? `${topMerchant.name}에서 ${formatKrw(topMerchant.amount)} 사용했습니다.` : "이번 달 가맹점 데이터가 없습니다."}
        />
        <AnalysisCard
          title="커피 지출"
          body={
            coffeeDelta === 0
              ? "커피 지출은 지난달과 거의 같습니다."
              : `커피 지출이 지난달보다 ${signedKrw(coffeeDelta)} 변했습니다.`
          }
        />
        <AnalysisCard
          title="할부 결제"
          body={`이번 달 할부 결제 금액은 ${formatKrw(data.metrics.installmentAmount)}입니다.`}
        />
      </section>

      <section>
        <h3 className="text-lg font-bold tracking-normal">카테고리 변화</h3>
        <div className="mt-3 flex flex-col gap-2">
          {categoryDeltas.map((row) => (
            <article key={row.name} className="rounded-lg border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{row.name}</p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {formatKrw(row.previous, true)} → {formatKrw(row.current, true)}
                  </p>
                </div>
                <p className={`text-sm font-bold ${row.delta > 0 ? "text-coral" : "text-mint"}`}>{signedKrw(row.delta)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AnalysisCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-700 dark:text-stone-200">{body}</p>
    </article>
  );
}

function buildCategoryDeltas(current: Transaction[], previous: Transaction[]) {
  const map = new Map<string, DeltaRow>();

  current.forEach((transaction) => {
    const name = transaction.categories?.name ?? "Other";
    const row = map.get(name) ?? { name, current: 0, previous: 0, delta: 0 };
    row.current += transaction.amount;
    map.set(name, row);
  });

  previous.forEach((transaction) => {
    const name = transaction.categories?.name ?? "Other";
    const row = map.get(name) ?? { name, current: 0, previous: 0, delta: 0 };
    row.previous += transaction.amount;
    map.set(name, row);
  });

  return [...map.values()]
    .map((row) => ({ ...row, delta: row.current - row.previous }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
