import { products } from "../data/products"
import ProductPackaging from "./ProductPackaging"

export default function Products() {
  return (
    <section id="produits" className="bg-cream py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tallow-deep">
            La gamme
          </p>
          <h2 className="mt-2 font-display text-4xl font-semibold text-earth sm:text-5xl">
            Cinq soins essentiels
          </h2>
          <p className="mt-4 text-lg text-earth-soft">
            Chaque produit est formulé autour du suif purifié issu de nos embouches bovines.
            Les photos packaging définitives arrivent bientôt.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {products.map((product) => (
            <article
              key={product.id}
              className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-cream-dark bg-white-warm transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(61,41,20,0.1)]"
            >
              <ProductPackaging packaging={product.packaging} name={product.name} />

              <div className="flex flex-1 flex-col border-t border-cream-dark p-5">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-tallow-deep">
                  {product.name}
                </p>
                <h3 className="mt-1 font-display text-xl font-semibold text-earth">{product.tagline}</h3>
                <p className="mt-3 text-sm leading-relaxed text-earth-soft">{product.description}</p>
                <p className="mt-3 text-xs font-medium text-earth-soft">{product.size}</p>

                <div className="mt-auto pt-5">
                  <button
                    type="button"
                    className="w-full rounded-full bg-earth px-4 py-2.5 text-sm font-semibold text-cream transition group-hover:bg-tallow-deep"
                  >
                    Commander
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
