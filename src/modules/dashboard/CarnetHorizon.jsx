import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import { MapPin } from 'lucide-react';

function CarnetSection({ title, subtitle, children }) {
  return (
    <section className="carnet-horizon-section rounded-xl border border-[#e8dcc8] bg-[#fffdf8] p-4 shadow-[0_1px_0_rgba(47,36,21,0.04)]">
      <header className="mb-3 border-b border-[#efe6d6] pb-2">
        <h2 className="text-sm font-black text-[#2f2415]">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[11px] text-[#8a7456]">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function CarnetHorizonHeader({
  greeting = '',
  location = 'Ferme principale',
  dateTime = '',
  periodLabel = '',
}) {
  return (
    <section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf8] p-5 shadow-[0_1px_0_rgba(47,36,21,0.04)]">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Carnet Horizon</p>
      <h1 className="mt-1 text-2xl font-black text-[#2f2415]">{greeting}</h1>
      {periodLabel ? (
        <div className="mt-2">
          <PeriodScopeBadge label={periodLabel} />
        </div>
      ) : null}
      <div className="mt-2 flex flex-col gap-1 text-sm text-[#8a7456] sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        {dateTime ? <span className="capitalize">{dateTime}</span> : null}
        {dateTime ? <span className="hidden sm:inline">·</span> : null}
        <span className="inline-flex items-center gap-1">
          <MapPin size={14} aria-hidden="true" />
          {location}
        </span>
      </div>
    </section>
  );
}

export default function CarnetHorizon({ carnet }) {
  if (!carnet) return null;

  return (
    <div className="carnet-horizon-root space-y-4">
      <style>{`
        .carnet-horizon-root {
          font-family: inherit;
        }
        .carnet-horizon-list li {
          border-bottom: 1px solid #f0e8da;
        }
        .carnet-horizon-list li:last-child {
          border-bottom: none;
        }
      `}</style>

      <CarnetSection title="Ce qui demande mon attention" subtitle="Priorités terrain — lecture seule">
        <ul className="carnet-horizon-list space-y-0">
          {carnet.attention.map((item, index) => (
            <li key={`attention-${index}`} className="py-2.5 text-sm leading-snug text-[#2f2415]">
              {item.text}
            </li>
          ))}
        </ul>
      </CarnetSection>

      <CarnetSection title="Aujourd'hui" subtitle="Journal d'exploitation">
        <ul className="carnet-horizon-list space-y-0">
          {carnet.today.map((item, index) => (
            <li key={`today-${index}`} className="flex gap-2 py-2.5 text-sm text-[#2f2415]">
              <span className="shrink-0 text-base leading-none" aria-hidden="true">{item.icon}</span>
              <span className="leading-snug">{item.text}</span>
            </li>
          ))}
        </ul>
      </CarnetSection>

      <CarnetSection title="État de l'exploitation" subtitle="Vue d'ensemble par domaine">
        <ul className="carnet-horizon-list space-y-0">
          {carnet.state.map((row) => (
            <li key={row.id} className="py-3">
              <div className="flex items-start gap-2">
                <span className="text-base leading-none" aria-hidden="true">{row.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#2f2415]">{row.label}</p>
                  <p className="mt-0.5 text-sm text-[#2f2415]">{row.value}</p>
                  <p className="mt-0.5 text-[11px] text-[#8a7456]">{row.detail}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CarnetSection>

      <CarnetSection title="Conseil Horizon" subtitle="Une recommandation">
        <div className="rounded-lg border border-[#efe6d6] bg-white/60 px-3 py-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#9a6b12]">💡 {carnet.conseil.title}</p>
          {carnet.conseil.lines.map((line, index) => (
            <p key={`conseil-${index}`} className={`text-sm leading-relaxed text-[#2f2415] ${index === 0 ? 'mt-2' : 'mt-1'}`}>
              {line}
            </p>
          ))}
        </div>
      </CarnetSection>
    </div>
  );
}
