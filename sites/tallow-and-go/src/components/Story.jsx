import { chainSteps } from '../data/products'
import { useLocale } from '../context/LocaleContext'

export default function Story() {
  const { locale, t } = useLocale()

  return (
    <section id="histoire" className="section-padding bg-[#ebe3d6] dark:bg-neutral-900/50">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tg-green">{t.story.kicker}</p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-earth dark:text-neutral-100 sm:text-5xl">
              {t.story.title}
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-earth-soft dark:text-neutral-300">
              <p>{t.story.p1}</p>
              <p>{t.story.p2}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {chainSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-cream-dark bg-white-warm p-5 dark:border-neutral-800 dark:bg-neutral-950"
              >
                <span className="font-display text-3xl font-semibold text-tg-green">{item.step}</span>
                <h3 className="mt-2 font-display text-xl font-semibold text-earth dark:text-neutral-100">
                  {item.title[locale]}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-earth-soft dark:text-neutral-400">{item.text[locale]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
