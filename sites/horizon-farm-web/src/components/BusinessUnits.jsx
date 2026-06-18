import { Beef, Egg, Factory, Sparkles } from 'lucide-react'
import { useLocale } from '../context/LocaleContext'

const icons = [Beef, Egg, Factory, Sparkles]
const keys = ['livestock', 'dairy', 'food', 'cosmetics']

export default function BusinessUnits() {
  const { t } = useLocale()

  return (
    <section id="units" className="section-padding bg-white dark:bg-neutral-900">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hf-gold">{t.units.kicker}</p>
          <h2 className="mt-3 font-display text-4xl font-medium text-hf-green dark:text-hf-ivory sm:text-5xl">
            {t.units.title}
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {keys.map((key, i) => {
            const Icon = icons[i]
            const unit = t.units[key]
            return (
              <article
                key={key}
                className="group rounded-3xl border border-neutral-200/80 bg-hf-ivory p-8 transition duration-500 hover:-translate-y-1 hover:border-hf-gold/40 hover:shadow-xl dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="mb-6 inline-flex rounded-2xl bg-hf-green/10 p-3 text-hf-green dark:bg-hf-green/20 dark:text-hf-gold-soft">
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl font-semibold text-hf-green dark:text-white">{unit.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{unit.desc}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
