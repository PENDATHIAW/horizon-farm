import { products } from '../data/products'
import { useLocale } from '../context/LocaleContext'

export default function Products() {
  const { locale, t } = useLocale()

  return (
    <section id="produits" className="section-padding bg-cream dark:bg-neutral-900">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tg-green">{t.products.kicker}</p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-earth dark:text-neutral-100 sm:text-5xl">
            {t.products.title}
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {products.map((product) => (
            <article
              key={product.id}
              className="product-card group flex flex-col overflow-hidden rounded-[1.5rem] border border-cream-dark bg-white-warm transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(35,74,52,0.12)] dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="relative h-52 overflow-hidden bg-[#f0e8dc]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full scale-[2.8] object-cover transition duration-700 group-hover:scale-[3]"
                  style={{ objectPosition: product.imagePosition }}
                />
                <div className="product-shine pointer-events-none absolute inset-0" />
                {product.featured ? (
                  <span className="absolute left-3 top-3 rounded-full bg-tg-green px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-tg-ivory">
                    Best-seller
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col border-t border-cream-dark p-5 dark:border-neutral-800">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-tg-green">{product.name}</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-earth dark:text-neutral-100">
                  {product.tagline[locale]}
                </h3>
                <p className="mt-2 text-xs font-medium text-earth-soft dark:text-neutral-400">{product.size}</p>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-tallow-deep">
                      {t.products.composition}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-earth-soft dark:text-neutral-400">
                      {product.composition.join(' · ')}
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {product.benefits[locale].map((benefit) => (
                      <li key={benefit} className="text-xs text-earth-soft dark:text-neutral-400">
                        — {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-5">
                  <button
                    type="button"
                    className="w-full rounded-full bg-tg-green px-4 py-2.5 text-sm font-semibold text-tg-ivory transition group-hover:bg-tg-green-light"
                  >
                    {t.products.shop}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
