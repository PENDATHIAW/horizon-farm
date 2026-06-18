import { useEffect, useState } from 'react'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { useLocale } from '../context/LocaleContext'
import { useTheme } from '../context/ThemeContext'

const links = [
  { href: '#about', key: 'about' },
  { href: '#units', key: 'units' },
  { href: '#tallow', key: 'tallow' },
  { href: '#trace', key: 'trace' },
  { href: '#impact', key: 'impact' },
  { href: '#investors', key: 'investors' },
  { href: '#contact', key: 'contact' },
]

export default function Header() {
  const { t, locale, switchLocale } = useLocale()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass shadow-sm py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8">
        <a href="#" className="flex items-center gap-3 group">
          <img src="/brand-logo.svg" alt="" className="h-9 w-auto" />
          <span
            className={`font-display text-lg font-semibold tracking-wide transition-colors ${
              scrolled ? 'text-hf-green dark:text-hf-ivory' : 'text-white'
            }`}
          >
            Horizon Farm
          </span>
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className={`text-sm font-medium transition hover:text-hf-gold ${
                scrolled ? 'text-neutral-700 dark:text-neutral-300' : 'text-white/90'
              }`}
            >
              {t.nav[link.key]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex rounded-full border border-current/20 p-0.5 text-xs font-semibold">
            {['fr', 'en'].map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => switchLocale(lang)}
                className={`rounded-full px-2.5 py-1 uppercase transition ${
                  locale === lang
                    ? 'bg-hf-green text-white'
                    : scrolled
                      ? 'text-neutral-600 dark:text-neutral-400'
                      : 'text-white/80'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggle}
            className={`rounded-full p-2 transition ${
              scrolled ? 'text-neutral-700 dark:text-neutral-300' : 'text-white'
            }`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className={`rounded-full p-2 lg:hidden ${scrolled ? 'text-neutral-800 dark:text-white' : 'text-white'}`}
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="glass mx-4 mt-3 rounded-2xl p-4 lg:hidden">
          {links.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="block py-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200"
              onClick={() => setOpen(false)}
            >
              {t.nav[link.key]}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  )
}
