import { ArrowDown, ArrowRight } from 'lucide-react'
import { useLocale } from '../context/LocaleContext'

export default function Hero() {
  const { t } = useLocale()

  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden">
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="https://images.unsplash.com/photo-1500595046743-cd271d707f53?w=1920&q=80"
          className="h-full w-full object-cover scale-105"
        >
          <source
            src="https://cdn.coverr.co/videos/coverr-cows-grazing-in-a-green-field-5632/1080p.mp4"
            type="video/mp4"
          />
        </video>
        <div className="hero-video-overlay absolute inset-0" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, rgba(196,163,90,0.15), transparent 50%), radial-gradient(circle at 80% 20%, rgba(45,94,68,0.3), transparent 40%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-20 pt-32 sm:px-8 lg:pb-28">
        <p className="reveal mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-hf-gold-soft">
          {t.hero.kicker}
        </p>
        <h1 className="reveal reveal-delay-1 font-display text-balance max-w-4xl text-5xl font-medium leading-[1.05] text-white sm:text-6xl lg:text-7xl">
          {t.hero.title}
        </h1>
        <p className="reveal reveal-delay-2 mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
          {t.hero.subtitle}
        </p>
        <div className="reveal reveal-delay-3 mt-10 flex flex-wrap gap-4">
          <a
            href="#about"
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-hf-green transition hover:bg-hf-ivory"
          >
            {t.hero.cta1}
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#tallow"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            {t.hero.cta2}
          </a>
        </div>
      </div>

      <a
        href="#about"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/60 transition hover:text-white"
        aria-label="Scroll"
      >
        <ArrowDown className="h-5 w-5 animate-bounce" />
      </a>
    </section>
  )
}
