import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import { MapPin } from 'lucide-react';

function DomainCard({ card }) {
  const hasAlerts = n(card.alerts) > 0;
  return (
    <article className="carnet-domain-card flex min-h-[108px] flex-col justify-between rounded-xl border border-[#e5dcc8] bg-gradient-to-b from-[#fffdf8] to-[#faf6ee] p-3 shadow-[0_1px_0_rgba(47,36,21,0.05)]">
      <div className="flex items-center gap-1.5">
        <span className="text-lg leading-none" aria-hidden="true">{card.icon}</span>
        <p className="text-[11px] font-black uppercase tracking-wide text-[#8a7456]">{card.label}</p>
      </div>
      <div className="mt-2">
        <p className="text-sm font-black leading-tight text-[#2f2415]">{card.value}</p>
        <p className={`mt-1 text-[11px] leading-snug ${hasAlerts ? 'font-semibold text-amber-800' : 'text-[#8a7456]'}`}>
          {card.detail}
        </p>
      </div>
    </article>
  );
}

function n(value) {
  return Number(value || 0);
}

export function CarnetHorizonHeader({
  displayName = 'Exploitant',
  location = 'Ferme principale',
  periodLabel = '',
}) {
  return (
    <section className="carnet-v2-hero rounded-2xl border border-[#e5dcc8] bg-[#fffdf8] px-5 py-4 shadow-[0_1px_0_rgba(47,36,21,0.04)]">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#9a6b12]">Carnet d&apos;exploitation</p>
      <h1 className="mt-1 text-xl font-black text-[#2f2415] sm:text-2xl">Bonjour {displayName}</h1>
      <p className="mt-0.5 text-sm text-[#5c4d38]">Voici l&apos;état de votre exploitation</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#8a7456]">
        {periodLabel ? <PeriodScopeBadge label={periodLabel} /> : null}
        <span className="inline-flex items-center gap-1">
          <MapPin size={13} aria-hidden="true" />
          {location}
        </span>
      </div>
    </section>
  );
}

export default function CarnetHorizon({ carnet, onNavigate }) {
  if (!carnet) return null;

  const journalItems = carnet.journal?.items || carnet.today || [];

  return (
    <div className="carnet-v2-root space-y-3">
      <style>{`
        .carnet-v2-root {
          max-height: calc(100vh - 10rem);
        }
        @media (min-width: 1024px) {
          .carnet-v2-root {
            overflow: hidden;
          }
        }
        .carnet-journal-track {
          scrollbar-width: thin;
        }
      `}</style>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {(carnet.domains || carnet.state || []).map((card) => (
          <DomainCard key={card.id} card={card} />
        ))}
      </div>

      <section className="rounded-xl border border-[#e5dcc8] bg-[#fffdf8] px-3 py-3 shadow-[0_1px_0_rgba(47,36,21,0.04)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-xs font-black uppercase tracking-wide text-[#8a7456]">Aujourd&apos;hui</h2>
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('sync_activity')}
              className="text-[11px] font-black text-[#9a6b12] hover:underline"
            >
              Voir tout →
            </button>
          ) : null}
        </div>
        <div className="carnet-journal-track flex gap-2 overflow-x-auto pb-0.5">
          {journalItems.map((item, index) => (
            <div
              key={`journal-${index}`}
              className="flex min-w-[148px] max-w-[200px] shrink-0 items-start gap-1.5 rounded-lg border border-[#efe6d6] bg-white/70 px-2.5 py-2"
            >
              <span className="text-xs font-black text-emerald-700" aria-hidden="true">{item.icon}</span>
              <span className="text-[11px] font-medium leading-snug text-[#2f2415]">{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#e5dcc8] bg-[#faf6ee] px-4 py-3">
        <p className="text-[11px] font-black uppercase tracking-wide text-[#9a6b12]">💡 {carnet.conseil?.title || 'Conseil Horizon'}</p>
        <p className="mt-1 text-sm leading-snug text-[#2f2415]">
          &ldquo;{carnet.conseil?.text || carnet.conseil?.lines?.join(' ')}&rdquo;
        </p>
      </section>
    </div>
  );
}
