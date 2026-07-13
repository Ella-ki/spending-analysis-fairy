import { FormEvent, useState } from "react";
import { Home, Link2 } from "lucide-react";
import { Button } from "../../shared/components/Button";
import type { HouseholdRole } from "../../shared/types";
import { useHousehold } from "./useHousehold";

export function HouseholdSetup() {
  const { createHousehold, joinHousehold } = useHousehold();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("우리집");
  const [joinCode, setJoinCode] = useState("");
  const [role, setRole] = useState<HouseholdRole>("husband");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "create") {
        await createHousehold({ name, role });
      } else {
        await joinHousehold({ joinCode: joinCode.trim(), role });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "가계부 설정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-stone-50 px-5 py-10 text-ink dark:bg-neutral-950 dark:text-stone-50">
      <section className="mx-auto flex max-w-md flex-col gap-6">
        <div>
          <p className="text-sm font-semibold text-mint">첫 설정</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">부부가 함께 볼 household를 연결해요.</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
            한 명이 household를 만들고, 다른 한 명은 설정 화면의 join code로 들어오면 같은 데이터를 봅니다.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-stone-200 p-1 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`min-h-11 rounded-md text-sm font-semibold ${mode === "create" ? "bg-white shadow-sm dark:bg-neutral-950" : "text-stone-600 dark:text-stone-300"}`}
          >
            새로 만들기
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`min-h-11 rounded-md text-sm font-semibold ${mode === "join" ? "bg-white shadow-sm dark:bg-neutral-950" : "text-stone-600 dark:text-stone-300"}`}
          >
            코드로 참여
          </button>
        </div>

        <form onSubmit={handleSubmit} className="fairy-card rounded-lg border p-4">
          {mode === "create" ? (
            <label className="block text-sm font-semibold">
              가계부 이름
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 dark:border-neutral-700 dark:bg-neutral-950">
                <Home className="h-5 w-5 text-stone-400" aria-hidden />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="min-h-12 w-full bg-transparent text-base outline-none"
                  required
                />
              </div>
            </label>
          ) : (
            <label className="block text-sm font-semibold">
              참여 코드
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 dark:border-neutral-700 dark:bg-neutral-950">
                <Link2 className="h-5 w-5 text-stone-400" aria-hidden />
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="min-h-12 w-full bg-transparent text-base outline-none"
                  required
                />
              </div>
            </label>
          )}

          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">내 역할</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["husband", "wife"] as const).map((nextRole) => (
                <button
                  key={nextRole}
                  type="button"
                  onClick={() => setRole(nextRole)}
                  className={`min-h-12 rounded-lg border text-sm font-semibold ${
                    role === nextRole
                      ? "border-ink bg-ink text-white dark:border-stone-50 dark:bg-stone-50 dark:text-ink"
                      : "border-stone-200 bg-stone-50 text-stone-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-stone-300"
                  }`}
                >
                  {nextRole === "husband" ? "건빵" : "교빵"}
                </button>
              ))}
            </div>
          </fieldset>

          <Button className="mt-5 w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "저장 중" : mode === "create" ? "가계부 만들기" : "가계부 참여"}
          </Button>

          {error ? (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
