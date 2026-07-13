import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const authStorage = typeof window === "undefined" ? undefined : window.localStorage;

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    persistSession: true,
    storage: authStorage,
    storageKey: "spending-analysis-fairy-auth",
  },
});
