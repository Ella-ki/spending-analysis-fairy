import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "../features/auth/AuthProvider";
import { AuthPage } from "../features/auth/AuthPage";
import { HouseholdGate } from "../features/household/HouseholdGate";
import { AppShell } from "../shared/components/AppShell";
import { ConfigMissing } from "../shared/components/ConfigMissing";
import { LoadingScreen } from "../shared/components/LoadingScreen";
import { env } from "../lib/env";
import { AnalysisPage } from "../features/analysis/AnalysisPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { UploadPage } from "../features/upload/UploadPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppRoutes() {
  const { session, isLoading } = useAuth();

  if (!env.isSupabaseConfigured) {
    return <ConfigMissing />;
  }

  if (isLoading) {
    return <LoadingScreen label="세션을 확인하고 있어요" />;
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <HouseholdGate>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HouseholdGate>
  );
}
