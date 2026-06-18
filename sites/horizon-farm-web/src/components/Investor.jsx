import { Download, FileText } from 'lucide-react'
import { useLocale } from '../context/LocaleContext'

export default function Investor() {
  const { t } = useLocale()

  return (
    <section id="investors" className="section-padding bg-hf-ivory dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-hf-green via-hf-green-light to-hf-green-dark p-8 sm:p-12 lg:p-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hf-gold-soft">{t.investors.kicker}</p>
              <h2 className="mt-3 font-display text-4xl font-medium text-white sm:text-5xl">{t.investors.title}</h2>
              <p className="mt-6 text-lg leading-relaxed text-white/75">{t.investors.p}</p>
              <a
                href="/HORIZON_FARM_DOSSIER.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-hf-green transition hover:bg-hf-ivory"
              >
                <Download className="h-4 w-4" />
                {t.investors.cta}
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {t.investors.points.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                >
                  <FileText className="h-5 w-5 shrink-0 text-hf-gold-soft" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-white/90">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
