import { benefits } from "../data/products"
import { Droplets, HandHeart, Recycle, ShieldCheck } from "lucide-react"

const icons = [ShieldCheck, Droplets, HandHeart, Recycle]

export default function Commitments() {
  return (
    <section id="engagements" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-[2rem] border border-cream-dark bg-gradient-to-br from-earth via-earth-soft to-earth p-8 text-cream sm:p-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tallow">
              Nos engagements
            </p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
              Simple, transparent, efficace
            </h2>
            <p className="mt-4 text-lg text-cream/80">
              Le suif est un ingrédient ancestral, proche de la composition lipidique de la peau.
              Nous le travaillons avec respect, sans compromis sur la qualité.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {benefits.map((item, index) => {
              const Icon = icons[index]
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                >
                  <Icon className="h-6 w-6 text-tallow" strokeWidth={1.75} />
                  <h3 className="mt-4 font-display text-2xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cream/80">{item.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
