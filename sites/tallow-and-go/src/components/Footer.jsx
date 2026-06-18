import { useLocale } from '../context/LocaleContext'

export default function Footer() {
  const { t } = useLocale()

  return (
    <footer className="border-t border-cream-dark bg-tg-green py-12 text-tg-ivory">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-3xl font-semibold">Tallow & Go</p>
            <p className="mt-2 text-sm text-tg-ivory/75">{t.footer.tagline}</p>
            <p className="mt-1 text-xs text-tg-ivory/60">{t.footer.made}</p>
          </div>
          <div className="text-sm text-tg-ivory/70">
            <p>Powered by purified beef tallow</p>
            <a href={`mailto:${t.contact.email}`} className="mt-3 block text-tg-ivory hover:underline">
              {t.contact.email}
            </a>
          </div>
        </div>
        <p className="mt-10 border-t border-tg-ivory/10 pt-6 text-center text-xs text-tg-ivory/50">
          © {new Date().getFullYear()} Tallow & Go
        </p>
      </div>
    </footer>
  )
}
