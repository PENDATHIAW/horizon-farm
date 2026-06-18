import { Leaf, Recycle, Shield } from 'lucide-react'
import { useLocale } from '../context/LocaleContext'

const icons = [Recycle, Leaf, Shield]

export default function Sustainability() {
  const { t } = useLocale()

  return (
    <section className="section-padding bg-white dark:bg-neutral-900">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hf-gold">{t.sustainability.kicker}</p>
          <h2 className="mt-3 font-display text-4xl font-medium text-hf-green dark:text-hf-ivory sm:text-5xl">
            {t.sustainability.title}
          </h2>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {t.sustainability.items.map((item, i) => {
            const Icon = icons[i]
            return (
              <div
                key={item.title}
                className="rounded-3xl border border-neutral-200/80 p-8 text-center dark:border-neutral-800"
              >
                <div className="mx-auto mb-5 inline-flex rounded-full bg-hf-green/10 p-4 text-hf-green dark:text-hf-gold-soft">
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl font-semibold text-hf-green dark:text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{item.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
