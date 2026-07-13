const themeKey = "household-finance-theme";

export type ThemePreference = "light" | "dark" | "system";

export function initializeTheme() {
  applyTheme(getStoredTheme());
}

export function getStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(themeKey);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function setStoredTheme(theme: ThemePreference) {
  localStorage.setItem(themeKey, theme);
  applyTheme(theme);
}

export function applyTheme(theme: ThemePreference) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", shouldUseDark);
}
