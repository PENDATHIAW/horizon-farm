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
            Suif purifié issu de nos embouches bovines, formulé artisanalement au Sénégal — pour
            nourrir, clarifier et faire rayonner votre peau au quotidien.
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
              <dt className="text-xs uppercase tracking-wider text-earth-soft">Suif</dt>
              <dd className="font-display text-2xl font-semibold text-earth">Embouches</dd>
            </div>
          </dl>
        </div>

        <div className="relative">
          <div className="absolute -left-6 top-8 h-40 w-40 rounded-full bg-blush/60 blur-2xl" />
          <div className="absolute -right-4 bottom-0 h-48 w-48 rounded-full bg-sage/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-cream-dark bg-white-warm shadow-[0_30px_80px_rgba(61,41,20,0.12)]">
            <img
              src="/tallow-and-go-lineup-final.png"
              alt="Gamme Tallow & Go — SAFA, AURA, SHINY, NOOR, SOFT KISS"
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
