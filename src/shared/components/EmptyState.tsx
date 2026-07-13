import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="fairy-card rounded-lg border border-dashed p-5 text-center">
      <h2 className="text-base font-semibold text-ink dark:text-stone-50">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
