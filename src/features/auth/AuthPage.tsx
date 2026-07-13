import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Mail, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { useAuth } from "./AuthProvider";

type AuthStep = "email" | "code";
type AuthStatus = "idle" | "sending" | "sent" | "verifying";

const RESEND_COOLDOWN_SECONDS = 60;

export function AuthPage() {
  const { signInWithEmail, verifyEmailOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<AuthStep>("email");
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);

  useEffect(() => {
    if (resendSecondsLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendSecondsLeft]);

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("sending");

    try {
      await signInWithEmail(email.trim());
      setStep("code");
      setStatus("sent");
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (caught) {
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "인증 코드를 보낼 수 없습니다.");
    }
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("verifying");

    try {
      await verifyEmailOtp(email.trim(), token.replace(/\D/g, ""));
    } catch (caught) {
      setStatus("sent");
      setError(caught instanceof Error ? caught.message : "인증 코드를 확인할 수 없습니다.");
    }
  }

  async function resendCode() {
    if (resendSecondsLeft > 0) {
      return;
    }

    setError(null);
    setStatus("sending");

    try {
      await signInWithEmail(email.trim());
      setToken("");
      setStatus("sent");
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (caught) {
      setStatus("sent");
      setError(caught instanceof Error ? caught.message : "인증 코드를 다시 보낼 수 없습니다.");
    }
  }

  const isResendDisabled = status === "sending" || resendSecondsLeft > 0;

  return (
    <main className="fairy-app-bg flex min-h-dvh items-center px-5 py-10 text-ink dark:text-stone-50">
      <section className="mx-auto flex w-full max-w-md flex-col gap-7">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-mint via-lavender to-petal text-white shadow-fairy">
            <WandSparkles className="h-7 w-7" aria-hidden />
          </div>
          <div className="fairy-chip rounded-lg px-3 py-2 text-xs font-bold">
            소비분석요정
          </div>
        </div>

        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-mint">
            <Sparkles className="h-4 w-4 text-lavender" aria-hidden />
            우리집 소비 흐름 정리
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-normal">카드값, 할부, 월급까지 한눈에 봅니다.</h1>
          <p className="mt-4 text-sm leading-6 text-stone-600 dark:text-stone-300">
            현대카드 명세서를 올리면 이번 달 소비와 다음 할부 부담, 교빵과 건빵의 현금흐름을 함께 정리합니다.
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="fairy-card rounded-lg border p-4">
            <label className="text-sm font-semibold" htmlFor="email">
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

            <Button className="mt-4 w-full" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "인증 코드 보내는 중" : "인증 코드 받기"}
            </Button>

            {error ? <ErrorMessage message={error} /> : null}
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="fairy-card rounded-lg border p-4">
            <div className="rounded-lg border border-lavender/20 bg-white/65 p-3 text-sm text-stone-600 dark:bg-neutral-950/65 dark:text-stone-300">
              <span className="font-semibold text-ink dark:text-stone-50">{email}</span> 로 보낸 6자리 코드를 입력해 주세요.
            </div>

            <label className="mt-4 block text-sm font-semibold" htmlFor="token">
              인증 코드
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-lavender/25 bg-white/70 px-3 dark:border-lavender/20 dark:bg-neutral-950/70">
              <KeyRound className="h-5 w-5 text-lavender" aria-hidden />
              <input
                id="token"
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={token}
                onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="min-h-12 w-full bg-transparent text-center text-2xl font-bold tracking-[0.35em] outline-none placeholder:text-stone-300"
              />
            </div>

            <Button className="mt-4 w-full" type="submit" disabled={status === "verifying" || token.length !== 6}>
              {status === "verifying" ? "확인 중" : "로그인하기"}
            </Button>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={resendCode}
                disabled={isResendDisabled}
                className="min-h-10 rounded-lg border border-lavender/25 bg-white/70 px-3 text-sm font-semibold text-ink disabled:opacity-50 dark:bg-neutral-950/70 dark:text-stone-50"
              >
                {status === "sending"
                  ? "재전송 중"
                  : resendSecondsLeft > 0
                    ? `${resendSecondsLeft}초 후 재전송`
                    : "코드 다시 받기"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setStatus("idle");
                  setToken("");
                  setError(null);
                  setResendSecondsLeft(0);
                }}
                className="min-h-10 rounded-lg border border-lavender/25 bg-white/70 px-3 text-sm font-semibold text-ink dark:bg-neutral-950/70 dark:text-stone-50"
              >
                이메일 바꾸기
              </button>
            </div>

            {error ? <ErrorMessage message={error} /> : null}
          </form>
        )}
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
