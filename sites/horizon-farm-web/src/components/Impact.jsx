import { stats } from '../data/content'
import { useLocale } from '../context/LocaleContext'

export default function Impact() {
  const { t } = useLocale()
  const statKeys = ['revenue', 'units', 'products', 'trace']

  return (
    <section id="impact" className="section-padding bg-hf-green text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hf-gold-soft">{t.impact.kicker}</p>
            <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{t.impact.title}</h2>
            <ul className="mt-8 space-y-3">
              {t.impact.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-white/80">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hf-gold" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, i) => {
              const label = t.impact.stats[statKeys[i]]
              return (
                <div
                  key={stat.key}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
                >
                  <p className="font-display text-4xl font-semibold text-hf-gold-soft">
                    {stat.value}
                    {stat.key === 'trace' ? '%' : ''}
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/90">{label.label}</p>
                  {label.sub ? <p className="text-xs text-white/50">{label.sub}</p> : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
