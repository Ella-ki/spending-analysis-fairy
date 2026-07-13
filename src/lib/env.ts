const placeholderUrl = "https://example.supabase.co";
const placeholderKey = "supabase-anon-key";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || placeholderUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || placeholderKey;

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured:
    Boolean(import.meta.env.VITE_SUPABASE_URL) &&
    Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY) &&
    !supabaseUrl.includes("your-project") &&
    supabaseAnonKey !== "your-public-anon-key",
};
