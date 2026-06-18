import { useLocale } from '../context/LocaleContext'

export default function About() {
  const { t } = useLocale()

  return (
    <section id="about" className="section-padding bg-hf-ivory dark:bg-neutral-950">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hf-gold">{t.about.kicker}</p>
          <h2 className="mt-3 font-display text-4xl font-medium text-hf-green dark:text-hf-ivory sm:text-5xl">
            {t.about.title}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">{t.about.p1}</p>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">{t.about.p2}</p>
          <blockquote className="mt-8 border-l-2 border-hf-gold pl-6 font-display text-2xl italic text-hf-green dark:text-hf-gold-soft">
            « {t.about.quote} »
          </blockquote>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
          <img
            src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80"
            alt="Agricultural landscape"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-hf-green/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 rounded-2xl glass p-5">
            <p className="font-display text-3xl font-semibold text-hf-green dark:text-white">17</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">ERP modules · Real-time pilotage</p>
          </div>
        </div>
      </div>
    </section>
  )
}
