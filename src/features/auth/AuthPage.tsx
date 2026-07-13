import { FormEvent, useState } from "react";
import { Mail, WalletCards } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { useAuth } from "./AuthProvider";

export function AuthPage() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("sending");

    try {
      await signInWithEmail(email);
      setStatus("sent");
    } catch (caught) {
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "로그인 메일을 보낼 수 없습니다.");
    }
  }

  return (
    <main className="flex min-h-dvh items-center bg-stone-50 px-5 py-10 text-ink dark:bg-neutral-950 dark:text-stone-50">
      <section className="mx-auto flex w-full max-w-md flex-col gap-7">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-ink text-stone-50 dark:bg-stone-50 dark:text-ink">
          <WalletCards className="h-7 w-7" aria-hidden />
        </div>

        <div>
          <p className="text-sm font-semibold text-mint">30초 월간 소비 확인</p>
          <h1 className="mt-2 text-4xl font-bold tracking-normal">우리집 카드값이 어디로 갔는지 바로 봅니다.</h1>
          <p className="mt-4 text-sm leading-6 text-stone-600 dark:text-stone-300">
            이메일 링크로 로그인하고, 부부가 같은 household 데이터를 함께 확인합니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft dark:border-neutral-800 dark:bg-neutral-900">
          <label className="text-sm font-semibold" htmlFor="email">
            이메일
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 dark:border-neutral-700 dark:bg-neutral-950">
            <Mail className="h-5 w-5 text-stone-400" aria-hidden />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="min-h-12 w-full bg-transparent text-base outline-none placeholder:text-stone-400"
            />
          </div>

          <Button className="mt-4 w-full" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "메일 보내는 중" : "로그인 링크 받기"}
          </Button>

          {status === "sent" ? (
            <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              메일함에서 로그인 링크를 열어 주세요.
            </p>
          ) : null}

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
