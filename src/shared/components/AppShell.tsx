import { Banknote, BarChart3, Home, Settings, Sparkles, UploadCloud } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useHousehold } from "../../features/household/useHousehold";

const navItems = [
  { to: "/", label: "홈", icon: Home },
  { to: "/upload", label: "업로드", icon: UploadCloud },
  { to: "/analysis", label: "분석", icon: BarChart3 },
  { to: "/cashflow", label: "현금", icon: Banknote },
  { to: "/settings", label: "설정", icon: Settings },
];

export function AppShell() {
  const { membership } = useHousehold();

  return (
    <div className="fairy-app-bg min-h-dvh text-ink dark:text-stone-50">
      <header className="sticky top-0 z-20 border-b border-lavender/25 bg-pearl/90 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] shadow-sm backdrop-blur dark:border-lavender/20 dark:bg-neutral-950/88">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-mint via-lavender to-petal text-white shadow-fairy">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-lavender">소비분석요정</p>
              <h1 className="truncate text-xl font-bold tracking-normal">{membership?.household.name ?? "우리집"}</h1>
            </div>
          </div>
          <div className="fairy-chip shrink-0 rounded-lg px-3 py-2 text-xs font-bold shadow-sm">
            {membership?.relationship_role === "wife" ? "교빵" : "건빵"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-28 pt-5">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-lavender/20 bg-white/92 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(47,143,107,0.08)] backdrop-blur dark:border-lavender/20 dark:bg-neutral-950/92">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? "bg-gradient-to-br from-mint to-lavender text-white shadow-fairy"
                      : "text-stone-500 hover:bg-white/80 dark:text-stone-400 dark:hover:bg-neutral-900"
                  }`
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
