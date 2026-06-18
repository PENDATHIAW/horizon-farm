import { Droplets, Leaf, ShieldCheck, Sparkles, Sun } from "lucide-react"

const benefits = [
  {
    icon: Droplets,
    fr: "Nourrit intensément",
    en: "Nourishes deeply",
  },
  {
    icon: Sparkles,
    fr: "Clarifie le teint",
    en: "Clarifies complexion",
  },
  {
    icon: Sun,
    fr: "Ravive l'éclat naturel",
    en: "Revives natural glow",
  },
  {
    icon: ShieldCheck,
    fr: "Convient à tous types de peau",
    en: "Suitable for all skin types",
  },
  {
    icon: Leaf,
    fr: "Sans parabène, sans silicone",
    en: "Paraben free, silicone free",
  },
  {
    flag: true,
    fr: "Fabriqué au Sénégal",
    en: "Made in Senegal",
  },
]

function SenegalFlag() {
  return (
    <span className="inline-flex h-5 w-7 overflow-hidden rounded-sm ring-1 ring-earth/10" aria-hidden="true">
      <span className="w-1/3 bg-[#00853f]" />
      <span className="w-1/3 bg-[#fdef42]" />
      <span className="w-1/3 bg-[#e31b23]" />
    </span>
  )
}

export default function BenefitsBar({ className = "" }) {
  return (
    <section className={`border-y border-cream-dark bg-white-warm py-8 ${className}`}>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-6">
        {benefits.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.fr} className="flex flex-col items-center gap-2 text-center">
              {item.flag ? (
                <SenegalFlag />
              ) : (
                <Icon className="h-6 w-6 text-tallow-deep" strokeWidth={1.5} />
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-earth">{item.fr}</p>
                <p className="text-[0.65rem] text-earth-soft">{item.en}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
