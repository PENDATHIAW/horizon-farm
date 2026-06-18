import { ArrowRight } from 'lucide-react'
import { lineupImage } from '../data/products'
import { useLocale } from '../context/LocaleContext'

export default function Hero() {
  const { t } = useLocale()

  return (
    <section className="relative min-h-[88vh] overflow-hidden">
      <img
        src={lineupImage}
        alt="Gamme Tallow & Go — SAFAA, AURA, SHINY, NOOR, SOFT KISS"
        className="absolute inset-0 h-full w-full scale-105 object-cover object-center"
      />
      <div className="hero-overlay absolute inset-0" />

      <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 lg:pb-24">
        <p className="reveal text-xs font-semibold uppercase tracking-[0.22em] text-tg-gold">{t.hero.kicker}</p>
        <h1 className="reveal reveal-d1 mt-4 max-w-3xl font-display text-balance text-5xl font-semibold leading-[1.05] text-tg-ivory sm:text-6xl lg:text-7xl">
          {t.hero.title}
        </h1>
        <p className="reveal reveal-d2 mt-6 max-w-xl text-lg leading-relaxed text-tg-ivory/85">{t.hero.subtitle}</p>

        <div className="reveal reveal-d2 mt-10 flex flex-wrap gap-3">
          <a
            href="#produits"
            className="inline-flex items-center gap-2 rounded-full bg-tg-ivory px-6 py-3 text-sm font-semibold text-tg-green transition hover:bg-white"
          >
            {t.hero.cta1}
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#histoire"
            className="inline-flex items-center rounded-full border border-tg-ivory/30 px-6 py-3 text-sm font-semibold text-tg-ivory transition hover:border-tg-ivory/60"
          >
            {t.hero.cta2}
          </a>
        </div>
      </div>
    </section>
  )
}
