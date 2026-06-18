export default function Footer() {
  return (
    <footer className="border-t border-cream-dark bg-earth py-10 text-cream">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-display text-2xl font-semibold">Tallow & Go</p>
          <p className="mt-1 text-sm text-cream/70">Cosmétiques naturels au suif</p>
        </div>
        <p className="text-sm text-cream/60">
          © {new Date().getFullYear()} Tallow & Go. Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}
