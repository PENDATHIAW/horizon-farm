import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function subscribeNewsletter(email) {
  if (!supabase) {
    return { ok: false, message: "Supabase non configuré pour le moment." }
  }

  const { error } = await supabase.from("newsletter_subscribers").insert({ email })

  if (error) {
    if (error.code === "23505") {
      return { ok: true, message: "Vous êtes déjà inscrit·e. Merci !" }
    }
    return { ok: false, message: "Une erreur est survenue. Réessayez plus tard." }
  }

  return { ok: true, message: "Merci ! Vous serez informé·e des nouveautés." }
}
