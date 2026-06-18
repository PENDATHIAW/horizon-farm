import { products } from "../data/products"

export default function Products() {
  return (
    <section id="produits" className="bg-white-warm py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tallow-deep">
            La boutique
          </p>
          <h2 className="mt-2 font-display text-4xl font-semibold text-earth sm:text-5xl">
            Nos soins essentiels
          </h2>
          <p className="mt-4 text-lg text-earth-soft">
            Une gamme courte et efficace, pensée pour le quotidien. Chaque produit est formulé
            autour du suif, complété par des huiles et beurres végétaux soigneusement choisis.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {products.map((product) => (
            <article
              key={product.id}
              className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-cream-dark bg-cream/50 transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(61,41,20,0.1)]"
            >
              <div className="relative aspect-[4/5] bg-gradient-to-br from-blush/50 via-cream to-tallow/25 p-6">
                {product.badge ? (
                  <span className="absolute left-4 top-4 rounded-full bg-earth px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-cream">
                    {product.badge}
                  </span>
                ) : null}
                <div className="flex h-full items-end">
                  <div className="w-full rounded-2xl bg-white-warm/85 p-4 backdrop-blur-sm ring-1 ring-cream-dark">
                    <p className="text-xs font-medium uppercase tracking-wider text-tallow-deep">
                      {product.tagline}
                    </p>
                    <p className="font-display text-2xl font-semibold text-earth">{product.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm leading-relaxed text-earth-soft">{product.description}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {product.benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="rounded-full bg-white-warm px-2.5 py-1 text-xs font-medium text-earth-soft ring-1 ring-cream-dark"
                    >
                      {benefit}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-end justify-between pt-6">
                  <div>
                    {product.price ? (
                      <p className="font-display text-3xl font-semibold text-earth">
                        {product.price}
                        {product.currency}
                      </p>
                    ) : null}
                    <p className="text-xs text-earth-soft">{product.size}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full bg-earth px-4 py-2 text-sm font-semibold text-cream transition group-hover:bg-tallow-deep"
                  >
                    Commander
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-earth-soft">
          Paiement et livraison seront connectés via Supabase + Vercel lors de la prochaine étape.
        </p>
      </div>
    </section>
  )
}
