import { ArrowRight, Sparkles } from "lucide-react"

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,162,122,0.25),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(125,139,111,0.18),transparent_40%)]" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-tallow/30 bg-white-warm/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-tallow-deep">
            <Sparkles className="h-3.5 w-3.5" />
            Cosmétiques au suif naturel
          </p>
          <h1 className="font-display text-balance text-5xl font-semibold leading-[1.05] text-earth sm:text-6xl lg:text-7xl">
            La douceur du suif,
            <span className="block italic text-tallow-deep">prête à partir.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-earth-soft">
            Tallow & Go propose des soins artisanaux, formulés avec peu d&apos;ingrédients et
            beaucoup d&apos;intention — pour nourrir, protéger et respecter votre peau au quotidien.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#produits"
              className="inline-flex items-center gap-2 rounded-full bg-tallow px-6 py-3 text-sm font-semibold text-earth shadow-[0_12px_30px_rgba(201,162,122,0.35)] transition hover:bg-tallow-deep hover:text-white"
            >
              Découvrir la gamme
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#histoire"
              className="inline-flex items-center rounded-full border border-earth/15 bg-white-warm px-6 py-3 text-sm font-semibold text-earth transition hover:border-tallow"
            >
              Notre démarche
            </a>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-cream-dark pt-8">
            <div>
              <dt className="text-xs uppercase tracking-wider text-earth-soft">Ingrédients</dt>
              <dd className="font-display text-2xl font-semibold text-earth">5–8 max</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-earth-soft">Fabrication</dt>
              <dd className="font-display text-2xl font-semibold text-earth">Main</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-earth-soft">Origine</dt>
              <dd className="font-display text-2xl font-semibold text-earth">Locale</dd>
            </div>
          </dl>
        </div>

        <div className="relative">
          <div className="absolute -left-6 top-8 h-40 w-40 rounded-full bg-blush/60 blur-2xl" />
          <div className="absolute -right-4 bottom-0 h-48 w-48 rounded-full bg-sage/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-cream-dark bg-gradient-to-br from-white-warm via-cream to-blush/40 p-8 shadow-[0_30px_80px_rgba(61,41,20,0.12)]">
            <div className="mb-6 flex items-center justify-between">
              <span className="rounded-full bg-earth px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cream">
                Collection 2026
              </span>
              <span className="text-sm font-medium text-earth-soft">100 % naturel</span>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl bg-white-warm/90 p-5 ring-1 ring-cream-dark">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-tallow-deep">
                  Signature
                </p>
                <p className="mt-1 font-display text-3xl font-semibold text-earth">Baume Universel</p>
                <p className="mt-2 text-sm text-earth-soft">
                  Texture fondante, fini non gras, parfum discret d&apos;huiles essentielles douces.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-earth p-4 text-cream">
                  <p className="text-xs uppercase tracking-wider text-cream/70">Peaux</p>
                  <p className="mt-1 font-medium">Sèches & sensibles</p>
                </div>
                <div className="rounded-2xl bg-sage/90 p-4 text-white">
                  <p className="text-xs uppercase tracking-wider text-white/75">Usage</p>
                  <p className="mt-1 font-medium">Corps, visage, lèvres</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
