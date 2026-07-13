import { Loader2 } from "lucide-react";

type LoadingScreenProps = {
  label?: string;
};

export function LoadingScreen({ label = "불러오는 중" }: LoadingScreenProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-6 text-ink dark:bg-neutral-950 dark:text-stone-50">
      <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-soft dark:border-neutral-800 dark:bg-neutral-900">
        <Loader2 className="h-5 w-5 animate-spin text-mint" aria-hidden />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </main>
  );
}
