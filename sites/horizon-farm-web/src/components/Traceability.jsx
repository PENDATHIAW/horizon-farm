import { useState } from 'react'
import { traceSteps } from '../data/content'
import { useLocale } from '../context/LocaleContext'

export default function Traceability() {
  const { t } = useLocale()
  const [active, setActive] = useState(0)

  return (
    <section id="trace" className="section-padding bg-hf-ivory dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hf-gold">{t.trace.kicker}</p>
          <h2 className="mt-3 font-display text-4xl font-medium text-hf-green dark:text-hf-ivory sm:text-5xl">
            {t.trace.title}
          </h2>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">{t.trace.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {traceSteps.map((step, i) => {
              const data = t.trace.steps[step.key]
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`flex shrink-0 items-center gap-3 rounded-2xl px-5 py-4 text-left transition ${
                    active === i
                      ? 'bg-hf-green text-white shadow-lg'
                      : 'bg-white text-neutral-700 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-800'
                  }`}
                >
                  <span className="text-xl">{step.icon}</span>
                  <span className="text-sm font-semibold">{data.title}</span>
                </button>
              )
            })}
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-hf-green p-8 sm:p-12 lg:min-h-[320px]">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-hf-gold/10 blur-3xl" />
            <div className="relative">
              <span className="text-5xl">{traceSteps[active].icon}</span>
              <h3 className="mt-6 font-display text-3xl font-medium text-white">
                {t.trace.steps[traceSteps[active].key].title}
              </h3>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/75">
                {t.trace.steps[traceSteps[active].key].desc}
              </p>
              <div className="mt-10 flex items-center gap-3 text-sm font-medium text-hf-gold-soft">
                {traceSteps.map((s, i) => (
                  <span key={s.key} className="flex items-center gap-3">
                    {i > 0 ? <span className="text-white/30">→</span> : null}
                    <span className={i === active ? 'text-white' : 'text-white/40'}>{t.trace.steps[s.key].title}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
