import { useState } from "react";
import { Copy, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useHousehold } from "../household/useHousehold";
import { Button } from "../../shared/components/Button";
import { getStoredTheme, setStoredTheme, type ThemePreference } from "../../lib/theme";

const futureFeatures = [
  "OCR",
  "PDF 가져오기",
  "여러 카드사",
  "은행 계좌 연동",
  "AI 소비 추천",
];

export function SettingsPage() {
  const { signOut } = useAuth();
  const { membership } = useHousehold();
  const [theme, setTheme] = useState<ThemePreference>(getStoredTheme());
  const [copied, setCopied] = useState(false);

  function handleThemeChange(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
  }

  async function copyJoinCode() {
    if (!membership) {
      return;
    }

    await navigator.clipboard.writeText(membership.household.join_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-col gap-7">
      <section>
        <p className="text-sm font-semibold text-mint">설정</p>
        <h2 className="mt-1 text-3xl font-bold tracking-normal">MVP v1 범위를 명확하게 유지합니다.</h2>
      </section>

      <section className="fairy-card rounded-lg border p-4">
        <h3 className="text-base font-bold tracking-normal">가계부</h3>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{membership?.household.name}</p>
        <div className="mt-3 rounded-lg border border-lavender/20 bg-white/65 p-3 font-mono text-xs text-stone-700 dark:bg-neutral-950/65 dark:text-stone-200">
          {membership?.household.join_code}
        </div>
        <Button
          className="mt-3 w-full"
          type="button"
          variant="secondary"
          icon={<Copy className="h-4 w-4" aria-hidden />}
          onClick={copyJoinCode}
        >
          {copied ? "복사됨" : "참여 코드 복사"}
        </Button>
      </section>

      <section className="fairy-card rounded-lg border p-4">
        <h3 className="text-base font-bold tracking-normal">화면 테마</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["system", "light", "dark"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleThemeChange(option)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border text-sm font-semibold ${
                theme === option
                  ? "border-ink bg-ink text-white dark:border-stone-50 dark:bg-stone-50 dark:text-ink"
                  : "border-stone-200 bg-stone-50 text-stone-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-stone-300"
              }`}
            >
              {option === "dark" ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
              {{ system: "시스템", light: "라이트", dark: "다크" }[option]}
            </button>
          ))}
        </div>
      </section>

      <section className="fairy-card rounded-lg border p-4">
        <h3 className="text-base font-bold tracking-normal">준비됨, 아직 구현하지 않음</h3>
        <div className="mt-3 flex flex-col gap-2">
          {futureFeatures.map((feature) => (
            <div key={feature} className="flex items-center justify-between rounded-lg border border-lavender/15 bg-white/65 px-3 py-2 text-sm dark:bg-neutral-950/65">
              <span className="font-medium">{feature}</span>
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">보류</span>
            </div>
          ))}
        </div>
      </section>

      <Button
        type="button"
        variant="danger"
        icon={<LogOut className="h-5 w-5" aria-hidden />}
        onClick={() => signOut()}
      >
        로그아웃
      </Button>
    </div>
  );
}
