import { FormEvent, useEffect, useMemo, useState } from "react";
import { Banknote, Home, Save } from "lucide-react";
import { addMonths, monthLabel, startOfMonth, toMonthKey } from "../../lib/dates";
import { formatKrw } from "../../lib/format";
import { Button } from "../../shared/components/Button";
import { EmptyState } from "../../shared/components/EmptyState";
import { LoadingScreen } from "../../shared/components/LoadingScreen";
import { useHousehold } from "../household/useHousehold";
import { useCashflowData, useSaveCashflow } from "./useCashflowData";

export function CashflowPage() {
  const { membership } = useHousehold();
  const householdId = membership?.household.id;
  const [monthKey, setMonthKey] = useState(toMonthKey(startOfMonth(new Date())));
  const selectedMonth = useMemo(() => new Date(`${monthKey}-01T00:00:00`), [monthKey]);
  const cashflowQuery = useCashflowData(householdId, selectedMonth);
  const saveCashflow = useSaveCashflow();
  const [husbandAmount, setHusbandAmount] = useState(0);
  const [wifeAmount, setWifeAmount] = useState(0);
  const [loanLabel, setLoanLabel] = useState("주택 대출");
  const [loanAmount, setLoanAmount] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!cashflowQuery.data) {
      return;
    }

    setHusbandAmount(cashflowQuery.data.income?.husband_amount ?? 0);
    setWifeAmount(cashflowQuery.data.income?.wife_amount ?? 0);
    const firstLoan = cashflowQuery.data.loanPayments[0];
    setLoanLabel(firstLoan?.label ?? "주택 대출");
    setLoanAmount(firstLoan?.amount ?? 0);
    setNotes(cashflowQuery.data.income?.notes ?? firstLoan?.notes ?? "");
  }, [cashflowQuery.data]);

  if (cashflowQuery.isLoading) {
    return <LoadingScreen label="현금흐름을 불러오는 중" />;
  }

  if (cashflowQuery.error) {
    return (
      <EmptyState
        title="현금흐름 입력을 열 수 없습니다"
        description="Supabase에 cashflow planning migration을 먼저 적용해 주세요. 적용 후 새로고침하면 월급과 주택대출 상환액을 저장할 수 있습니다."
      />
    );
  }

  const totalIncome = husbandAmount + wifeAmount;
  const cashAfterLoan = totalIncome - loanAmount;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!householdId) {
      return;
    }

    saveCashflow.mutate({
      householdId,
      month: selectedMonth,
      husbandAmount,
      wifeAmount,
      loanLabel,
      loanAmount,
      notes,
    });
  }

  return (
    <div className="flex flex-col gap-7">
      <section>
        <p className="flex items-center gap-2 text-sm font-semibold text-mint">
          <Banknote className="h-4 w-4 text-lavender" aria-hidden />
          현금흐름
        </p>
        <h2 className="mt-1 text-3xl font-bold tracking-normal">월급과 집 관련 대출을 따로 기록합니다.</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
          카드값과 분리해서 들어오는 돈, 집 관련 고정 상환액을 월별로 저장해 대시보드 잔여 현금 계산에 반영합니다.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <SummaryCard label="월급 합계" value={formatKrw(totalIncome, true)} />
        <SummaryCard label="주택 대출" value={formatKrw(loanAmount, true)} />
        <SummaryCard label="교빵 월급" value={formatKrw(wifeAmount, true)} />
        <SummaryCard label="건빵 월급" value={formatKrw(husbandAmount, true)} />
      </section>

      <form onSubmit={handleSubmit} className="fairy-card rounded-lg border p-4">
        <label className="block text-sm font-semibold">
          기준 월
          <input
            type="month"
            value={monthKey}
            onChange={(event) => setMonthKey(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-lg border border-lavender/25 bg-white/70 px-3 text-base outline-none dark:border-lavender/20 dark:bg-neutral-950/70"
          />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MoneyInput label="교빵 월급" value={wifeAmount} onChange={setWifeAmount} />
          <MoneyInput label="건빵 월급" value={husbandAmount} onChange={setHusbandAmount} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px]">
          <label className="block text-sm font-semibold">
            대출 이름
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-lavender/25 bg-white/70 px-3 dark:border-lavender/20 dark:bg-neutral-950/70">
              <Home className="h-5 w-5 text-lavender" aria-hidden />
              <input
                value={loanLabel}
                onChange={(event) => setLoanLabel(event.target.value)}
                className="min-h-12 w-full bg-transparent text-base outline-none"
              />
            </div>
          </label>
          <MoneyInput label="월 상환액" value={loanAmount} onChange={setLoanAmount} />
        </div>

        <label className="mt-4 block text-sm font-semibold">
          메모
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border border-lavender/25 bg-white/70 px-3 py-3 text-base outline-none dark:border-lavender/20 dark:bg-neutral-950/70"
            placeholder="상환 계좌, 변동 예정 등을 적어둘 수 있어요."
          />
        </label>

        <Button className="mt-4 w-full" type="submit" disabled={saveCashflow.isPending} icon={<Save className="h-5 w-5" aria-hidden />}>
          {saveCashflow.isPending ? "저장 중" : `${monthLabel(monthKey)} 현금흐름 저장`}
        </Button>

        {saveCashflow.isSuccess ? (
          <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            저장됐어요. 대시보드에도 바로 반영됩니다.
          </p>
        ) : null}

        {saveCashflow.error ? (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-200">
            {saveCashflow.error.message}
          </p>
        ) : null}
      </form>

      <section className="fairy-card rounded-lg border p-4">
        <h3 className="text-base font-bold tracking-normal">다음 달 준비</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
          {monthLabel(toMonthKey(addMonths(selectedMonth, 1)))}에도 같은 금액이 반복된다면 다음 달에 그대로 저장하면 됩니다. 자동 반복 기능은 이후 버전에서 추가할 수 있게 구조만 열어뒀습니다.
        </p>
        <p className="mt-3 text-sm font-semibold text-ink dark:text-stone-50">
          대출 제외 후 현금 기준: {formatKrw(cashAfterLoan, true)}
        </p>
      </section>
    </div>
  );
}

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        type="number"
        min="0"
        step="10000"
        value={value || ""}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="mt-2 min-h-12 w-full rounded-lg border border-lavender/25 bg-white/70 px-3 text-base outline-none dark:border-lavender/20 dark:bg-neutral-950/70"
        placeholder="0"
      />
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="fairy-card rounded-lg border p-4">
      <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">{label}</p>
      <p className="mt-2 break-words text-xl font-bold tracking-normal">{value}</p>
    </article>
  );
}