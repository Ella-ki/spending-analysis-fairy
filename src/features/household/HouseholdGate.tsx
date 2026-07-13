import type { ReactNode } from "react";
import { HouseholdProvider, useHousehold } from "./useHousehold";
import { HouseholdSetup } from "./HouseholdSetup";
import { LoadingScreen } from "../../shared/components/LoadingScreen";

type HouseholdGateProps = {
  children: ReactNode;
};

export function HouseholdGate({ children }: HouseholdGateProps) {
  return (
    <HouseholdProvider>
      <HouseholdContent>{children}</HouseholdContent>
    </HouseholdProvider>
  );
}

function HouseholdContent({ children }: HouseholdGateProps) {
  const { membership, isLoading, error } = useHousehold();

  if (isLoading) {
    return <LoadingScreen label="가계부를 불러오는 중" />;
  }

  if (error) {
    return (
      <main className="min-h-dvh bg-stone-50 px-5 py-10 text-ink dark:bg-neutral-950 dark:text-stone-50">
        <section className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          가계부 데이터를 불러오지 못했습니다. Supabase migration과 RLS 정책이 적용됐는지 확인해 주세요.
          <p className="mt-2 font-mono text-xs">{error.message}</p>
        </section>
      </main>
    );
  }

  if (!membership) {
    return <HouseholdSetup />;
  }

  return children;
}
