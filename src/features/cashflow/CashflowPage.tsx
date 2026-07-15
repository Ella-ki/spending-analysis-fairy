import { FormEvent, useEffect, useMemo, useState } from "react";
import { Banknote, CalendarDays, Home, Landmark, Save } from "lucide-react";
import { addMonths, monthLabel, startOfMonth, toMonthKey } from "../../lib/dates";
import { formatKrw } from "../../lib/format";
import { Button } from "../../shared/components/Button";
import { EmptyState } from "../../shared/components/EmptyState";
import { LoadingScreen } from "../../shared/components/LoadingScreen";
import { useHousehold } from "../household/useHousehold";
import { useCashflowData, useSaveCashflow } from "./useCashflowData";

const WOORI_NOTICE_DEFAULTS = {
  bankName: "우리은행",
  loanLabel: "내집마련디딤돌대출(이차보전)",
  loanAccountMask: "1320-10*-******",
  loanBalanceAmount: 264_188_064,
  loanAmount: 1_175_631,
  principalAmount: 482_138,
  interestAmount: 693_493,
};

export function CashflowPage() {
  const { membership } = useHousehold();
  const householdId = membership?.household.id;
  const [monthKey, setMonthKey] = useState(toMonthKey(startOfMonth(new Date())));
  const selectedMonth = useMemo(() => new Date(`${monthKey}-01T00:00:00`), [monthKey]);
  const cashflowQuery = useCashflowData(householdId, selectedMonth);
  const saveCashflow = useSaveCashflow();
  const [husbandAmount, setHusbandAmount] = useState(0);
  const [wifeAmount, setWifeAmount] = useState(0);
  const [bankName, setBankName] = useState(WOORI_NOTICE_DEFAULTS.bankName);
  const [loanLabel, setLoanLabel] = useState(WOORI_NOTICE_DEFAULTS.loanLabel);
  const [loanAccountMask, setLoanAccountMask] = useState(WOORI_NOTICE_DEFAULTS.loanAccountMask);
  const [loanBalanceAmount, setLoanBalanceAmount] = useState(WOORI_NOTICE_DEFAULTS.loanBalanceAmount);
  const [loanDueDate, setLoanDueDate] = useState(defaultDueDate(monthKey));
  const [loanAmount, setLoanAmount] = useState(WOORI_NOTICE_DEFAULTS.loanAmount);
  const [principalAmount, setPrincipalAmount] = useState(WOORI_NOTICE_DEFAULTS.principalAmount);
  const [interestAmount, setInterestAmount] = useState(WOORI_NOTICE_DEFAULTS.interestAmount);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!cashflowQuery.data) {
      return;
    }

    const firstLoan = cashflowQuery.data.loanPayments[0];
    setHusbandAmount(cashflowQuery.data.income?.husband_amount ?? 0);
    setWifeAmount(cashflowQuery.data.income?.wife_amount ?? 0);
    setBankName(firstLoan?.bank_name ?? WOORI_NOTICE_DEFAULTS.bankName);
    setLoanLabel(firstLoan?.label ?? WOORI_NOTICE_DEFAULTS.loanLabel);
    setLoanAccountMask(firstLoan?.loan_account_mask ?? WOORI_NOTICE_DEFAULTS.loanAccountMask);
    setLoanBalanceAmount(firstLoan?.balance_amount ?? WOORI_NOTICE_DEFAULTS.loanBalanceAmount);
    setLoanDueDate(firstLoan?.due_date ?? defaultDueDate(monthKey));
    setLoanAmount(firstLoan?.amount ?? WOORI_NOTICE_DEFAULTS.loanAmount);
    setPrincipalAmount(firstLoan?.principal_amount ?? WOORI_NOTICE_DEFAULTS.principalAmount);
    setInterestAmount(firstLoan?.interest_amount ?? WOORI_NOTICE_DEFAULTS.interestAmount);
    setNotes(cashflowQuery.data.income?.notes ?? firstLoan?.notes ?? "");
  }, [cashflowQuery.data, monthKey]);

  if (cashflowQuery.isLoading) {
    return <LoadingScreen label="현금 흐름을 불러오는 중" />;
  }

  if (cashflowQuery.error) {
    return (
      <EmptyState
        title="현금 흐름 입력을 열 수 없습니다"
        description="Supabase에 최신 cashflow migration을 먼저 적용해 주세요. 적용 후 새로고침하면 월급과 우리은행 대출 납입 예정 내역을 저장할 수 있습니다."
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
      bankName,
      loanLabel,
      loanAccountMask,
      loanBalanceAmount,
      loanDueDate,
      loanAmount,
      principalAmount,
      interestAmount,
      notes,
    });
  }

  return (
    <div className="flex flex-col gap-7">
      <section>
        <p className="flex items-center gap-2 text-sm font-semibold text-mint">
          <Banknote className="h-4 w-4 text-lavender" aria-hidden />
          현금 흐름
        </p>
        <h2 className="mt-1 text-3xl font-bold tracking-normal">월급과 집 관련 대출을 따로 기록합니다.</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
          카드값과 분리해서 들어오는 돈, 주택 대출 원리금, 대출 잔액을 월별로 저장해 대시보드의 여유 현금 계산에 반영합니다.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <SummaryCard label="월급 합계" value={formatKrw(totalIncome, true)} />
        <SummaryCard label="원리금 예정" value={formatKrw(loanAmount, true)} />
        <SummaryCard label="교빵 월급" value={formatKrw(wifeAmount, true)} />
        <SummaryCard label="건빵 월급" value={formatKrw(husbandAmount, true)} />
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <section className="fairy-card rounded-lg border p-4">
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
        </section>

        <section className="fairy-card rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-lavender/15 text-lavender">
              <Landmark className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">우리은행 알림 기반</p>
              <h3 className="mt-1 text-lg font-bold tracking-normal">대출 이자(원리금) 납부 예정</h3>
              <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-300">
                문자로 받은 대출명, 잔액, 납입예정일, 원금과 이자를 따로 저장합니다.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput label="은행" value={bankName} onChange={setBankName} icon={<Landmark className="h-5 w-5 text-lavender" aria-hidden />} />
            <TextInput label="대출 계좌번호" value={loanAccountMask} onChange={setLoanAccountMask} />
          </div>

          <label className="mt-3 block text-sm font-semibold">
            대출명
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-lavender/25 bg-white/70 px-3 dark:border-lavender/20 dark:bg-neutral-950/70">
              <Home className="h-5 w-5 text-lavender" aria-hidden />
              <input
                value={loanLabel}
                onChange={(event) => setLoanLabel(event.target.value)}
                className="min-h-12 w-full bg-transparent text-base outline-none"
              />
            </div>
          </label>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MoneyInput label="대출잔액" value={loanBalanceAmount} onChange={setLoanBalanceAmount} />
            <label className="block text-sm font-semibold">
              납입예정일
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-lavender/25 bg-white/70 px-3 dark:border-lavender/20 dark:bg-neutral-950/70">
                <CalendarDays className="h-5 w-5 text-lavender" aria-hidden />
                <input
                  type="date"
                  value={loanDueDate}
                  onChange={(event) => setLoanDueDate(event.target.value)}
                  className="min-h-12 w-full bg-transparent text-base outline-none"
                />
              </div>
            </label>
            <MoneyInput label="납입금액" value={loanAmount} onChange={setLoanAmount} />
            <MoneyInput label="분할상환원금" value={principalAmount} onChange={setPrincipalAmount} />
            <MoneyInput label="납입이자" value={interestAmount} onChange={setInterestAmount} />
          </div>

          <div className="mt-4 rounded-lg border border-lavender/20 bg-white/60 p-3 text-sm leading-6 text-stone-700 dark:bg-neutral-950/60 dark:text-stone-200">
            <p className="font-semibold">{bankName} 납부 예정 요약</p>
            <p className="mt-1">
              {loanDueDate}에 {formatKrw(loanAmount)} 납입 예정입니다. 원금 {formatKrw(principalAmount)}, 이자 {formatKrw(interestAmount)}, 잔액 {formatKrw(loanBalanceAmount)}.
            </p>
          </div>
        </section>

        <section className="fairy-card rounded-lg border p-4">
          <label className="block text-sm font-semibold">
            메모
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-lavender/25 bg-white/70 px-3 py-3 text-base outline-none dark:border-lavender/20 dark:bg-neutral-950/70"
              placeholder="상환 계좌, 변동 예정, 확인 사항을 적어둘 수 있어요."
            />
          </label>

          <Button className="mt-4 w-full" type="submit" disabled={saveCashflow.isPending} icon={<Save className="h-5 w-5" aria-hidden />}>
            {saveCashflow.isPending ? "저장 중" : `${monthLabel(monthKey)} 현금 흐름 저장`}
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
        </section>
      </form>

      <section className="fairy-card rounded-lg border p-4">
        <h3 className="text-base font-bold tracking-normal">다음 달 준비</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
          {monthLabel(toMonthKey(addMonths(selectedMonth, 1)))}에도 같은 금액을 반복한다면 다음 달에 그대로 저장하면 됩니다. 자동 반복 기능은 이후 버전에서 붙일 수 있게 구조만 열어뒀습니다.
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
        step="1000"
        value={value || ""}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="mt-2 min-h-12 w-full rounded-lg border border-lavender/25 bg-white/70 px-3 text-base outline-none dark:border-lavender/20 dark:bg-neutral-950/70"
        placeholder="0"
      />
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: JSX.Element;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-lavender/25 bg-white/70 px-3 dark:border-lavender/20 dark:bg-neutral-950/70">
        {icon}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-12 w-full bg-transparent text-base outline-none"
        />
      </div>
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

function defaultDueDate(monthKey: string) {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart || new Date().getFullYear());
  const month = Number(monthPart || new Date().getMonth() + 1);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
