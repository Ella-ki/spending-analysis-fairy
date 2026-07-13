import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-5 text-center dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="text-base font-semibold text-ink dark:text-stone-50">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
