import { createClient } from "@supabase/supabase-js";

const viteEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};

const supabaseUrl =
  viteEnv.VITE_SUPABASE_URL || "https://xmqfvmswrjhteaijnaxb.supabase.co";

const supabaseAnonKey =
  viteEnv.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcWZ2bXN3cmpodGVhaWpuYXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQ0NTcsImV4cCI6MjA5MzU5MDQ1N30.WR0rWE9I3fZJVzdt7UaOzgc_U4UHdsXAf5nsgt_n-7M";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: "horizon-farm-auth",
  },
});

