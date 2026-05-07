import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://xmqfvmswrjhteaijnaxb.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcWZ2bXN3cmpodGVhaWpuYXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQ0NTcsImV4cCI6MjA5MzU5MDQ1N30.WR0rWE9I3fZJVzdt7UaOzgc_U4UHdsXAf5nsgt_n-7M";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: "horizon-farm-auth",
  },
});

