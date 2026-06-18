export default function Story() {
  return (
    <section id="histoire" className="bg-cream py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div className="order-2 lg:order-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="h-44 rounded-[1.5rem] bg-gradient-to-br from-blush to-tallow/40" />
              <div className="h-28 rounded-[1.5rem] bg-earth p-5 text-cream">
                <p className="text-xs uppercase tracking-wider text-cream/70">Depuis</p>
                <p className="font-display text-3xl font-semibold">2026</p>
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <div className="h-28 rounded-[1.5rem] bg-sage/85 p-5 text-white">
                <p className="text-xs uppercase tracking-wider text-white/75">Valeurs</p>
                <p className="mt-1 font-medium">Nature · Transparence · Efficacité</p>
              </div>
              <div className="h-44 rounded-[1.5rem] bg-gradient-to-br from-cream-dark to-white-warm ring-1 ring-cream-dark" />
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tallow-deep">
            Notre histoire
          </p>
          <h2 className="mt-2 font-display text-4xl font-semibold text-earth sm:text-5xl">
            Du terrain à votre peau
          </h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-earth-soft">
            <p>
              Tallow & Go est né d&apos;une conviction simple : les soins les plus efficaces sont
              souvent les plus simples. Le suif, longtemps oublié, revient comme une alternative
              naturelle aux formules surchargées.
            </p>
            <p>
              Nous formulons chaque produit en petites séries, testons les textures sur des peaux
              réelles, et privilégions des circuits courts — du fournisseur au pot final.
            </p>
            <p>
              <strong className="font-semibold text-earth">Tallow and Go</strong>, c&apos;est l&apos;idée
              d&apos;un soin prêt à l&apos;emploi, nomade et sincère — à emporter partout, pour toute la
              famille.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
