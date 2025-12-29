import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Provide a graceful fallback so the app doesn't hang on Loading
function createFallbackSupabase() {
  const noop = async () => ({
    data: null,
    error: new Error("Supabase not configured"),
  });
  const okSession = async () => ({ data: { session: null }, error: null });
  const okUser = async () => ({ data: { user: null }, error: null });
  const subscription = { unsubscribe: () => {} };

  return {
    auth: {
      getSession: okSession,
      getUser: okUser,
      signOut: async () => ({ error: null }),
      signInWithPassword: noop,
      signUp: noop,
      signInWithOAuth: noop,
      onAuthStateChange: () => ({ data: { subscription } }),
    },
    from: () => ({
      select: noop,
      insert: noop,
      update: noop,
      delete: noop,
      eq: noop,
      maybeSingle: noop,
      single: noop,
    }),
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
    }),
    removeChannel: () => {},
  };
}

let client;
if (!supabaseUrl || !supabaseAnonKey) {
  // Warn instead of throwing to avoid infinite Loading when env is missing
  console.error(
    "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Using fallback client."
  );
  client = createFallbackSupabase();
} else {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = client;
