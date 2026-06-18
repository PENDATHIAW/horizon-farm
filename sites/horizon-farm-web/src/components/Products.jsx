import { ArrowUpRight } from 'lucide-react'
import { products } from '../data/content'
import { useLocale } from '../context/LocaleContext'

export default function Products({ variant = 'light' }) {
  const { t, locale } = useLocale()
  const dark = variant === 'dark'

  return (
    <div>
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${dark ? 'text-hf-gold-soft' : 'text-hf-gold'}`}>
            {t.products.kicker}
          </p>
          <h3 className={`mt-2 font-display text-3xl font-medium sm:text-4xl ${dark ? 'text-white' : 'text-hf-green dark:text-white'}`}>
            {t.products.title}
          </h3>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {products.map((product) => (
          <article
            key={product.id}
            className={`product-card group relative overflow-hidden rounded-2xl ${
              dark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-white ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800'
            } ${product.featured ? 'lg:col-span-1' : ''}`}
          >
            <div className={`relative aspect-[3/4] bg-gradient-to-br ${product.gradient} overflow-hidden`}>
              <div className="product-shine absolute inset-0 pointer-events-none" />
              <div className="absolute inset-0 flex flex-col items-center justify-end p-5 text-center">
                <span className="font-display text-3xl font-bold tracking-tight text-neutral-800/80">{product.name}</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-600">
                  {product.tagline[locale]}
                </span>
              </div>
              {product.featured ? (
                <span className="absolute left-4 top-4 rounded-full bg-hf-green px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Best
                </span>
              ) : null}
            </div>
            <div className="p-4">
              <p className={`text-xs ${dark ? 'text-white/60' : 'text-neutral-500'}`}>{product.size}</p>
              <p className={`mt-1 text-sm ${dark ? 'text-white/80' : 'text-neutral-700 dark:text-neutral-300'}`}>
                {product.note[locale]}
              </p>
              <button
                type="button"
                className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition hover:gap-2 ${
                  dark ? 'text-hf-gold-soft' : 'text-hf-green dark:text-hf-gold'
                }`}
              >
                {t.products.shop}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
