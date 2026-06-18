import { Droplets, Leaf, ShieldCheck, Sparkles, Sun } from 'lucide-react'
import { useLocale } from '../context/LocaleContext'

const benefitIcons = [Droplets, Sparkles, Sun, ShieldCheck, Leaf, null]

function SenegalFlag() {
  return (
    <span className="inline-flex h-5 w-7 overflow-hidden rounded-sm ring-1 ring-earth/10" aria-hidden="true">
      <span className="w-1/3 bg-[#00853f]" />
      <span className="w-1/3 bg-[#fdef42]" />
      <span className="w-1/3 bg-[#e31b23]" />
    </span>
  )
}

export default function BenefitsBar({ className = '' }) {
  const { locale, t } = useLocale()

  return (
    <section className={`border-y border-cream-dark bg-white-warm py-8 dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-6">
        {t.benefits.map((item, index) => {
          const Icon = benefitIcons[index]
          const label = item[locale]
          return (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              {Icon ? (
                <Icon className="h-6 w-6 text-tg-green" strokeWidth={1.5} />
              ) : (
                <SenegalFlag />
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-earth dark:text-neutral-200">{label}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
