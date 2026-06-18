export default function Footer() {
  return (
    <footer className="border-t border-cream-dark bg-earth py-12 text-cream">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-3xl font-semibold">Tallow & Go</p>
            <p className="mt-2 text-sm text-cream/75">Nourrir • Clarifier • Rayonner</p>
            <p className="mt-1 text-xs text-cream/60">Nourish • Clarify • Glow</p>
          </div>
          <div className="text-sm text-cream/70">
            <p>Powered by purified beef tallow</p>
            <p className="mt-1">Fabriqué au Sénégal</p>
            <a href="mailto:hello@tallowandgo.com" className="mt-3 block text-cream hover:underline">
              hello@tallowandgo.com
            </a>
          </div>
        </div>
        <p className="mt-10 border-t border-cream/10 pt-6 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} Tallow & Go — Continuité élevage & cosmétique naturelle
        </p>
      </div>
    </footer>
  )
}
