import { useState } from "react"
import { subscribeNewsletter } from "../lib/supabase"

export default function Contact() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setStatus(null)

    const result = await subscribeNewsletter(email.trim())
    setStatus(result)
    setLoading(false)

    if (result.ok) {
      setEmail("")
    }
  }

  return (
    <section id="contact" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-[2rem] border border-cream-dark bg-white-warm">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tallow-deep">
                Restez informé·e
              </p>
              <h2 className="mt-2 font-display text-4xl font-semibold text-earth">
                Rejoignez la communauté Tallow & Go
              </h2>
              <p className="mt-4 text-earth-soft">
                Nouveautés, conseils d&apos;usage et offres de lancement — une newsletter courte,
                sans spam.
              </p>

              <form className="mt-8 space-y-3" onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-earth" htmlFor="email">
                  Votre e-mail
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="vous@exemple.com"
                    className="w-full rounded-full border border-cream-dark bg-cream/40 px-5 py-3 text-earth outline-none transition focus:border-tallow"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full bg-earth px-6 py-3 text-sm font-semibold text-cream transition hover:bg-earth-soft disabled:opacity-60"
                  >
                    {loading ? "Envoi..." : "S'inscrire"}
                  </button>
                </div>
                {status ? (
                  <p
                    className={`text-sm ${status.ok ? "text-sage" : "text-tallow-deep"}`}
                    role="status"
                  >
                    {status.message}
                  </p>
                ) : null}
              </form>
            </div>

            <div className="bg-gradient-to-br from-tallow/25 via-blush/30 to-cream p-8 sm:p-12">
              <h3 className="font-display text-3xl font-semibold text-earth">Nous contacter</h3>
              <ul className="mt-6 space-y-4 text-earth-soft">
                <li>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-tallow-deep">
                    E-mail
                  </span>
                  <a href="mailto:hello@tallowandgo.com" className="font-medium text-earth hover:text-tallow-deep">
                    hello@tallowandgo.com
                  </a>
                </li>
                <li>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-tallow-deep">
                    WhatsApp
                  </span>
                  <a href="https://wa.me/" className="font-medium text-earth hover:text-tallow-deep">
                    Commander par message
                  </a>
                </li>
                <li>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-tallow-deep">
                    Livraison
                  </span>
                  <span>France & international — détails à venir</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
