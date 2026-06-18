export default function Commitments() {
  return (
    <section id="engagements" className="bg-white-warm py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tallow-deep">
            Nos engagements
          </p>
          <h2 className="mt-2 font-display text-4xl font-semibold text-earth sm:text-5xl">
            Un suif sincere, une chaîne maîtrisée
          </h2>
          <p className="mt-4 text-lg text-earth-soft">
            Tallow & Go prolonge notre projet d&apos;élevage : chaque gramme de suif peut être
            tracé jusqu&apos;à nos embouches bovines. Pas de formule opaque, pas de compromis.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Traçabilité",
              text: "Du bétail au pot — circuit court et maîtrisé.",
            },
            {
              title: "Purification",
              text: "Suif purifié, adapté aux soins de la peau.",
            },
            {
              title: "Artisanal",
              text: "Petites séries formulées à la main au Sénégal.",
            },
            {
              title: "Transparence",
              text: "Ingrédients lisibles, sans parabène ni silicone.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-cream-dark bg-cream/50 p-6"
            >
              <h3 className="font-display text-2xl font-semibold text-earth">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-earth-soft">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
