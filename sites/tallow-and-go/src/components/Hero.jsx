import { ArrowRight } from "lucide-react"
import BrandLogo from "./BrandLogo"
import OriginBadge from "./OriginBadge"

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#f0e8dc]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_0%_0%,rgba(61,41,20,0.08),transparent),radial-gradient(ellipse_50%_50%_at_100%_0%,rgba(201,162,122,0.15),transparent)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="text-center">
          <BrandLogo showTagline className="mx-auto" />
          <OriginBadge className="mx-auto mt-6" variant="dark" />
        </div>

        <div className="mt-10 overflow-hidden rounded-[2rem] border border-cream-dark bg-white-warm shadow-[0_30px_80px_rgba(61,41,20,0.1)]">
          <img
            src="/tallow-and-go-lineup-final.png"
            alt="Gamme Tallow & Go — SAFA, AURA, SHINY, NOOR, SOFT KISS"
            className="h-auto w-full object-cover"
          />
        </div>

        <div className="mx-auto mt-10 max-w-3xl text-center">
          <h1 className="font-display text-balance text-4xl font-semibold leading-tight text-earth sm:text-5xl">
            Du troupeau à la peau — cosmétiques au suif de nos embouches bovines
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-earth-soft">
            Formulés artisanalement au Sénégal, nos soins nourrissent, clarifient et font rayonner —
            avec peu d&apos;ingrédients et une traçabilité totale, de l&apos;élevage au packaging.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#produits"
              className="inline-flex items-center gap-2 rounded-full bg-earth px-6 py-3 text-sm font-semibold text-cream transition hover:bg-earth-soft"
            >
              Voir la gamme
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#histoire"
              className="inline-flex items-center rounded-full border border-earth/15 bg-white-warm px-6 py-3 text-sm font-semibold text-earth transition hover:border-tallow"
            >
              Notre chaîne de valeur
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
