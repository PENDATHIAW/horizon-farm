import { useLocale } from '../context/LocaleContext'

export default function Commitments() {
  const { t } = useLocale()

  return (
    <section id="engagements" className="section-padding bg-white-warm dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tg-green">{t.sustainability.title}</p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-earth dark:text-neutral-100 sm:text-5xl">
            {t.sustainability.title}
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {t.sustainability.items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-cream-dark bg-cream/50 p-6 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h3 className="font-display text-2xl font-semibold text-earth dark:text-neutral-100">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-earth-soft dark:text-neutral-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
