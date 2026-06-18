import { chainSteps } from "../data/products"

export default function Story() {
  return (
    <section id="histoire" className="bg-[#ebe3d6] py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tallow-deep">
              Notre histoire
            </p>
            <h2 className="mt-2 font-display text-4xl font-semibold text-earth sm:text-5xl">
              L&apos;élevage qui devient soin
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-earth-soft">
              <p>
                Tallow & Go est la continuité naturelle de notre activité d&apos;élevage. La graisse
                de bœuf issue de nos embouches bovines est valorisée, purifiée, puis transformée en
                soins qui respectent la peau.
              </p>
              <p>
                C&apos;est la même exigence que sur la ferme : qualité, traçabilité, respect du
                vivant — appliquée cette fois à la cosmétique naturelle.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {chainSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-cream-dark bg-white-warm p-5"
              >
                <span className="font-display text-3xl font-semibold text-tallow-deep">
                  {item.step}
                </span>
                <h3 className="mt-2 font-display text-xl font-semibold text-earth">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-earth-soft">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
