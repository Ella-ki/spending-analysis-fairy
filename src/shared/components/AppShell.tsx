import { BarChart3, Home, Settings, UploadCloud } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useHousehold } from "../../features/household/useHousehold";

const navItems = [
  { to: "/", label: "홈", icon: Home },
  { to: "/upload", label: "업로드", icon: UploadCloud },
  { to: "/analysis", label: "분석", icon: BarChart3 },
  { to: "/settings", label: "설정", icon: Settings },
];

export function AppShell() {
  const { membership } = useHousehold();

  return (
    <div className="min-h-dvh bg-stone-50 text-ink dark:bg-neutral-950 dark:text-stone-50">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-mint">소비분석요정</p>
            <h1 className="text-xl font-bold tracking-normal">{membership?.household.name ?? "우리집"}</h1>
          </div>
          <div className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-stone-600 shadow-sm dark:bg-neutral-900 dark:text-stone-300">
            {membership?.relationship_role === "wife" ? "교빵" : "건빵"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-28 pt-5">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1">
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
                      ? "bg-ink text-white dark:bg-stone-50 dark:text-ink"
                      : "text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-neutral-900"
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
