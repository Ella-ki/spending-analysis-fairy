import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
  helper?: ReactNode;
};

const tones = {
  neutral: "border-stone-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
  good: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950",
  warn: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950",
  bad: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950",
};

export function MetricCard({ label, value, tone = "neutral", helper }: MetricCardProps) {
  return (
    <article className={`rounded-lg border p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold tracking-normal">{value}</p>
      {helper ? <div className="mt-2 text-xs text-stone-600 dark:text-stone-300">{helper}</div> : null}
    </article>
  );
}
