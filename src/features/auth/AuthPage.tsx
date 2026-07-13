import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, Mail, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "../../shared/components/Button";
import { useAuth } from "./AuthProvider";

type AuthMode = "signin" | "signup" | "forgot";
type AuthStatus = "idle" | "submitting";

export function AuthPage() {
  const { isPasswordRecovery, signInWithPassword, signUpWithPassword, sendPasswordReset, updatePassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isPasswordRecovery) {
      setError(null);
      setSuccess(null);
      setPassword("");
      setConfirmPassword("");
    }
  }, [isPasswordRecovery]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setStatus("submitting");

    try {
      if (isPasswordRecovery) {
        if (password !== confirmPassword) {
          throw new Error("비밀번호가 서로 달라요.");
        }

        await updatePassword(password);
        setSuccess("비밀번호가 변경됐어요. 이제 앱으로 이동합니다.");
        return;
      }

      if (mode === "signin") {
        await signInWithPassword(email.trim(), password);
      } else if (mode === "signup") {
        await signUpWithPassword(email.trim(), password);
        setSuccess("계정이 만들어졌어요. 이메일 확인 설정이 켜져 있다면 Supabase에서 확인을 완료해 주세요.");
      } else {
        await sendPasswordReset(email.trim());
        setSuccess("비밀번호 재설정 메일을 보냈어요. 메일의 링크를 열고 새 비밀번호를 설정해 주세요.");
      }
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
          <h1 className="text-3xl font-black leading-tight text-ink dark:text-stone-50">
            {isPasswordRecovery ? "새 비밀번호를 설정해요." : "카드값, 할부, 월급까지 한눈에 봅니다."}
          </h1>
          <p className="text-sm leading-6 text-stone-600 dark:text-stone-300">
            {isPasswordRecovery
              ? "메일 링크 확인이 끝났어요. 여기서 새 비밀번호를 저장하면 바로 앱을 사용할 수 있습니다."
              : "현대카드 명세서를 올리면 이번 달 소비와 다음 할부 부담, 교빵과 건빵의 현금흐름을 함께 정리합니다."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="fairy-card rounded-lg border p-4">
          {!isPasswordRecovery ? (
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-white/55 p-1 dark:bg-neutral-950/55">
              <ModeButton mode={mode} value="signin" onSelect={setMode} label="로그인" />
              <ModeButton mode={mode} value="signup" onSelect={setMode} label="계정 만들기" />
              <ModeButton mode={mode} value="forgot" onSelect={setMode} label="재설정" />
            </div>
          ) : null}

          {isPasswordRecovery ? null : (
            <>
              <label className="mt-4 block text-sm font-semibold" htmlFor="email">
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
            </>
          )}

          {mode === "forgot" && !isPasswordRecovery ? null : (
            <>
              <label className="mt-4 block text-sm font-semibold" htmlFor="password">
                {isPasswordRecovery ? "새 비밀번호" : "비밀번호"}
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-lavender/25 bg-white/70 px-3 dark:border-lavender/20 dark:bg-neutral-950/70">
                <LockKeyhole className="h-5 w-5 text-lavender" aria-hidden />
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="8자 이상"
                  className="min-h-12 w-full bg-transparent text-base outline-none placeholder:text-stone-400"
                />
              </div>
            </>
          )}

          {isPasswordRecovery ? (
            <>
              <label className="mt-4 block text-sm font-semibold" htmlFor="confirm-password">
                새 비밀번호 확인
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-lavender/25 bg-white/70 px-3 dark:border-lavender/20 dark:bg-neutral-950/70">
                <LockKeyhole className="h-5 w-5 text-lavender" aria-hidden />
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="한 번 더 입력"
                  className="min-h-12 w-full bg-transparent text-base outline-none placeholder:text-stone-400"
                />
              </div>
            </>
          ) : null}

          <Button className="mt-4 w-full" type="submit" disabled={isSubmitting}>
            {getSubmitText({ isPasswordRecovery, isSubmitting, mode })}
          </Button>

          {mode === "forgot" && !isPasswordRecovery ? (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setSuccess(null);
              }}
              className="mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold text-stone-500 hover:text-ink dark:text-stone-300 dark:hover:text-white"
            >
              로그인으로 돌아가기
            </button>
          ) : null}

          {success ? <SuccessMessage message={success} /> : null}
          {error ? <ErrorMessage message={error} /> : null}
        </form>
      </section>
    </main>
  );
}

function ModeButton({
  mode,
  value,
  onSelect,
  label,
}: {
  mode: AuthMode;
  value: AuthMode;
  onSelect: (mode: AuthMode) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`min-h-10 rounded-lg text-sm font-bold transition ${
        mode === value
          ? "bg-ink text-white shadow-sm dark:bg-stone-100 dark:text-ink"
          : "text-stone-500 hover:text-ink dark:text-stone-300 dark:hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function getSubmitText({
  isPasswordRecovery,
  isSubmitting,
  mode,
}: {
  isPasswordRecovery: boolean;
  isSubmitting: boolean;
  mode: AuthMode;
}) {
  if (isSubmitting) {
    return "처리 중";
  }

  if (isPasswordRecovery) {
    return "새 비밀번호 저장";
  }

  if (mode === "signin") {
    return "로그인";
  }

  if (mode === "signup") {
    return "계정 만들기";
  }

  return "재설정 메일 받기";
}

function SuccessMessage({ message }: { message: string }) {
  return (
    <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
      {message}
    </p>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-200">
      {message}
    </p>
  );
}
