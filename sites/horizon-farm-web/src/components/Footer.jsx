import { useLocale } from '../context/LocaleContext'

export default function Footer() {
  const { t } = useLocale()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-neutral-200 bg-hf-ivory py-12 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8">
        <div className="flex items-center gap-3">
          <img src="/brand-logo.svg" alt="" className="h-8 w-auto opacity-80" />
          <span className="font-display text-lg font-semibold text-hf-green dark:text-hf-ivory">Horizon Farm</span>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          © {year} Horizon Farm · {t.footer.tagline}
        </p>
        <p className="text-xs text-neutral-400">{t.footer.rights}</p>
      </div>
    </footer>
  )
}
