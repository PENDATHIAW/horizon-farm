import { Mail, MapPin, Send } from 'lucide-react'
import { useLocale } from '../context/LocaleContext'

export default function Contact() {
  const { t } = useLocale()

  return (
    <section id="contact" className="section-padding bg-white dark:bg-neutral-900">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hf-gold">{t.contact.kicker}</p>
            <h2 className="mt-3 font-display text-4xl font-medium text-hf-green dark:text-white sm:text-5xl">
              {t.contact.title}
            </h2>
            <ul className="mt-8 space-y-4">
              <li className="flex items-center gap-3 text-neutral-600 dark:text-neutral-400">
                <Mail className="h-5 w-5 text-hf-green dark:text-hf-gold" />
                <a href={`mailto:${t.contact.email}`} className="hover:text-hf-green dark:hover:text-hf-gold">
                  {t.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-3 text-neutral-600 dark:text-neutral-400">
                <Mail className="h-5 w-5 text-hf-green dark:text-hf-gold" />
                <a href={`mailto:${t.contact.tallow}`} className="hover:text-hf-green dark:hover:text-hf-gold">
                  {t.contact.tallow}
                </a>
              </li>
              <li className="flex items-center gap-3 text-neutral-600 dark:text-neutral-400">
                <MapPin className="h-5 w-5 text-hf-green dark:text-hf-gold" />
                {t.contact.location}
              </li>
            </ul>
          </div>
          <form
            className="rounded-3xl border border-neutral-200 bg-hf-ivory p-8 dark:border-neutral-800 dark:bg-neutral-950"
            onSubmit={(e) => e.preventDefault()}
          >
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t.contact.name}</label>
            <input
              type="text"
              className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-hf-green dark:border-neutral-700 dark:bg-neutral-900"
            />
            <label className="mt-4 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
            <input
              type="email"
              className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-hf-green dark:border-neutral-700 dark:bg-neutral-900"
            />
            <label className="mt-4 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t.contact.message}</label>
            <textarea
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-hf-green dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              type="submit"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-hf-green px-6 py-3 text-sm font-semibold text-white transition hover:bg-hf-green-light"
            >
              <Send className="h-4 w-4" />
              {t.contact.send}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
