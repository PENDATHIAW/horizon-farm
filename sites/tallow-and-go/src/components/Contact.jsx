import { useState } from 'react'
import { useLocale } from '../context/LocaleContext'
import { subscribeNewsletter } from '../lib/supabase'

export default function Contact() {
  const { t } = useLocale()
  const [email, setEmail] = useState('')
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
      setEmail('')
    }
  }

  return (
    <section id="contact" className="section-padding">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-[2rem] border border-cream-dark bg-white-warm dark:border-neutral-800 dark:bg-neutral-950">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tg-green">{t.contact.title}</p>
              <h2 className="mt-3 font-display text-4xl font-semibold text-earth dark:text-neutral-100">
                {t.contact.title}
              </h2>

              <form className="mt-8 space-y-3" onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-earth dark:text-neutral-200" htmlFor="email">
                  Email
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t.contact.placeholder}
                    className="w-full rounded-full border border-cream-dark bg-cream/40 px-5 py-3 text-earth outline-none transition focus:border-tg-green dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full bg-tg-green px-6 py-3 text-sm font-semibold text-tg-ivory transition hover:bg-tg-green-light disabled:opacity-60"
                  >
                    {loading ? '…' : t.contact.send}
                  </button>
                </div>
                {status ? (
                  <p
                    className={`text-sm ${status.ok ? 'text-sage' : 'text-tallow-deep'}`}
                    role="status"
                  >
                    {status.message}
                  </p>
                ) : null}
              </form>
            </div>

            <div className="bg-gradient-to-br from-tg-green/20 via-blush/30 to-cream p-8 sm:p-12 dark:from-tg-green/30 dark:via-neutral-900 dark:to-neutral-950">
              <h3 className="font-display text-3xl font-semibold text-earth dark:text-neutral-100">Contact</h3>
              <ul className="mt-6 space-y-4 text-earth-soft dark:text-neutral-400">
                <li>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-tg-green">Email</span>
                  <a href={`mailto:${t.contact.email}`} className="font-medium text-earth hover:text-tg-green dark:text-neutral-200">
                    {t.contact.email}
                  </a>
                </li>
                <li>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-tg-green">WhatsApp</span>
                  <a href="https://wa.me/" className="font-medium text-earth hover:text-tg-green dark:text-neutral-200">
                    {t.products.shop}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
