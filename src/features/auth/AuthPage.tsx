import { FormEvent, useState } from "react";
import { LockKeyhole, Mail, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { useAuth } from "./AuthProvider";

type AuthStatus = "idle" | "submitting";

export function AuthPage() {
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("submitting");

    try {
      await signInWithPassword(email.trim(), password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "로그인 처리 중 문제가 생겼어요.");
    } finally {
      setStatus("idle");
    }
  }

  const isSubmitting = status === "submitting";

  return (
    <main className="fairy-app-bg flex min-h-dvh items-center px-5 py-10 text-ink dark:text-stone-50">
      <section className="mx-auto flex w-full max-w-md flex-col gap-7">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-mint via-lavender to-petal text-white shadow-fairy">
            <WandSparkles className="h-7 w-7" aria-hidden />
          </div>
          <div className="fairy-chip rounded-lg px-3 py-2 text-xs font-bold">소비분석요정</div>
        </div>

        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-mint">
            <Sparkles className="h-4 w-4 text-lavender" aria-hidden />
            우리집 소비 흐름 정리
          </p>
        </div>

        <form onSubmit={handleSubmit} className="fairy-card rounded-lg border p-4">
          <label className="block text-sm font-semibold" htmlFor="email">
            이메일
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-lavender/25 bg-white/70 px-3 dark:border-lavender/20 dark:bg-neutral-950/70">
            <Mail className="h-5 w-5 text-lavender" aria-hidden />
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

          <label className="mt-4 block text-sm font-semibold" htmlFor="password">
            비밀번호
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-lavender/25 bg-white/70 px-3 dark:border-lavender/20 dark:bg-neutral-950/70">
            <LockKeyhole className="h-5 w-5 text-lavender" aria-hidden />
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Supabase에서 설정한 비밀번호"
              className="min-h-12 w-full bg-transparent text-base outline-none placeholder:text-stone-400"
            />
          </div>

          <Button className="mt-4 w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중" : "로그인"}
          </Button>

          {error ? <ErrorMessage message={error} /> : null}
        </form>
      </section>
    </main>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-200">
      {message}
    </p>
  );
}
