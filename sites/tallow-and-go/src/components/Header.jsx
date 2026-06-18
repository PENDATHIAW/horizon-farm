import { Menu, Moon, ShoppingBag, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { useLocale } from '../context/LocaleContext'
import { useTheme } from '../context/ThemeContext'

export default function Header() {
  const [open, setOpen] = useState(false)
  const { locale, switchLocale, t } = useLocale()
  const { theme, toggle } = useTheme()

  const links = [
    { href: '#produits', label: t.nav.products },
    { href: '#traceabilite', label: t.nav.trace },
    { href: '#histoire', label: t.nav.story },
    { href: '#contact', label: t.nav.contact },
  ]

  return (
    <header className="sticky top-0 z-50 glass border-b border-cream-dark/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="#" className="flex items-center gap-3">
          <img src="/brand-logo.svg" alt="" className="h-9 w-9" />
          <span>
            <span className="block font-display text-xl font-semibold leading-none tracking-wide text-earth dark:text-neutral-100">
              Tallow & Go
            </span>
            <span className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-tg-green">
              Suif purifié · Sénégal
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-earth-soft transition hover:text-earth dark:text-neutral-300 dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => switchLocale(locale === 'fr' ? 'en' : 'fr')}
            className="hidden rounded-full border border-cream-dark px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-earth-soft transition hover:border-tg-green hover:text-tg-green sm:inline-flex dark:border-neutral-700 dark:text-neutral-300"
            aria-label="Changer de langue"
          >
            {locale === 'fr' ? 'EN' : 'FR'}
          </button>

          <button
            type="button"
            onClick={toggle}
            className="inline-flex rounded-full border border-cream-dark p-2 text-earth-soft transition hover:border-tg-green hover:text-tg-green dark:border-neutral-700 dark:text-neutral-300"
            aria-label={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <a
            href="#produits"
            className="hidden items-center gap-2 rounded-full bg-tg-green px-4 py-2 text-sm font-semibold text-tg-ivory transition hover:bg-tg-green-light sm:inline-flex"
          >
            <ShoppingBag className="h-4 w-4" />
            {t.products.shop}
          </a>

          <button
            type="button"
            className="inline-flex rounded-full border border-cream-dark p-2 text-earth md:hidden dark:border-neutral-700 dark:text-neutral-200"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-cream-dark bg-white-warm px-4 py-4 md:hidden dark:border-neutral-800 dark:bg-neutral-950">
          <ul className="space-y-3">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block text-base font-medium text-earth-soft dark:text-neutral-300"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => switchLocale(locale === 'fr' ? 'en' : 'fr')}
                className="text-base font-medium text-tg-green"
              >
                {locale === 'fr' ? 'English' : 'Français'}
              </button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
