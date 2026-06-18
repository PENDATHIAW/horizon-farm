import { useLocale } from '../context/LocaleContext'
import Products from './Products'

export default function TallowSection() {
  const { t } = useLocale()

  return (
    <section id="tallow" className="section-padding bg-hf-green text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hf-gold-soft">{t.tallow.kicker}</p>
            <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl lg:text-6xl">{t.tallow.title}</h2>
            <p className="mt-6 text-lg leading-relaxed text-white/75">{t.tallow.subtitle}</p>
            <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider">
              🐂 {t.tallow.badge}
            </span>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl">
            <img
              src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=900&q=80"
              alt="Premium skincare"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-hf-green/80 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 font-display text-5xl font-bold tracking-tight opacity-90">
              TG
            </div>
          </div>
        </div>
        <div className="mt-20">
          <Products variant="dark" />
        </div>
      </div>
    </section>
  )
}
