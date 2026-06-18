import { Leaf, Menu, ShoppingBag, X } from "lucide-react"
import { useState } from "react"

const links = [
  { href: "#produits", label: "Produits" },
  { href: "#engagements", label: "Engagements" },
  { href: "#histoire", label: "Notre histoire" },
  { href: "#contact", label: "Contact" },
]

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-cream-dark/80 bg-white-warm/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="#" className="group flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-earth text-cream shadow-sm">
            <Leaf className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span>
            <span className="block font-display text-xl font-semibold leading-none tracking-tight text-earth">
              Tallow & Go
            </span>
            <span className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-tallow-deep">
              Naturel · Artisanal
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-earth-soft transition hover:text-tallow-deep"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#produits"
            className="hidden items-center gap-2 rounded-full bg-earth px-4 py-2 text-sm font-semibold text-cream transition hover:bg-earth-soft sm:inline-flex"
          >
            <ShoppingBag className="h-4 w-4" />
            Commander
          </a>
          <button
            type="button"
            className="inline-flex rounded-full border border-cream-dark p-2 text-earth md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-cream-dark bg-white-warm px-4 py-4 md:hidden">
          <ul className="space-y-3">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block text-base font-medium text-earth-soft"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#produits"
                className="inline-flex items-center gap-2 rounded-full bg-earth px-4 py-2 text-sm font-semibold text-cream"
                onClick={() => setOpen(false)}
              >
                <ShoppingBag className="h-4 w-4" />
                Commander
              </a>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
