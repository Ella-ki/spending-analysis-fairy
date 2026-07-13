import { KeyRound } from "lucide-react";

export function ConfigMissing() {
  return (
    <main className="min-h-dvh bg-stone-50 px-5 py-10 text-ink dark:bg-neutral-950 dark:text-stone-50">
      <section className="mx-auto flex max-w-lg flex-col gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink text-stone-50 dark:bg-stone-50 dark:text-ink">
          <KeyRound className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-mint">Supabase 연결 필요</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">환경 변수를 먼저 설정해 주세요.</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
            <code>.env.example</code>을 복사해 <code>.env.local</code>을 만들고
            <code> VITE_SUPABASE_URL</code>, <code> VITE_SUPABASE_ANON_KEY</code>를 입력하면 앱이
            인증 화면으로 이동합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
