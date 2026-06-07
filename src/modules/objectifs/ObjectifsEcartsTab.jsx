import { fmtCurrency, fmtNumber } from '../../utils/format';

function AlertBadge({ level }) {
  const cls = level === 'red'
    ? 'bg-red-100 text-red-800 border-red-200'
    : level === 'orange'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : level === 'green'
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
        : 'bg-[#fffdf8] text-[#8a7456] border-[#eadcc2]';
  const label = level === 'red' ? 'Critique' : level === 'orange' ? 'Écart' : level === 'green' ? 'Conforme' : '—';
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${cls}`}>{label}</span>;
}

function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-black text-[#2f2415]">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function ObjectifsEcartsTab({ plan = {}, onNavigate }) {
  const zootechnical = plan.zootechnical || [];
  const financial = plan.financial || {};
  const workshops = financial.workshops || [];
  const mispricing = financial.mispricingAlerts || [];

  return (
    <div className="space-y-6">
      <Section
        title="Zootechnique — écarts aux standards souche"
        subtitle="Date pivot J-0, âge courant et comparaison au référentiel Code_Souche (Pondeuses, Chair, Bovins)."
      >
        {zootechnical.length ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {zootechnical.map((row) => (
              <div key={row.lotId} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-[#8a7456]">{row.breedLabel} · {row.workshop}</p>
                    <p className="font-black text-[#2f2415]">{row.lotName}</p>
                    <p className="text-xs text-[#8a7456]">Pivot {row.pivotDate} · J+{row.ageDays}</p>
                  </div>
                  <AlertBadge level={row.alertLevel} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-[#eadcc2] bg-white p-2">
                    <p className="text-[10px] text-[#8a7456]">{row.metricLabel} réel</p>
                    <p className="font-black text-[#2f2415]">{fmtNumber(row.realValue)}{row.unit === '%' ? '%' : ` ${row.unit}`}</p>
                  </div>
                  <div className="rounded-xl border border-[#eadcc2] bg-white p-2">
                    <p className="text-[10px] text-[#8a7456]">Objectif souche</p>
                    <p className="font-black text-[#2f2415]">{row.theoreticalValue != null ? `${fmtNumber(row.theoreticalValue)}${row.unit === '%' ? '%' : ` ${row.unit}`}` : '—'}</p>
                  </div>
                  {row.gmqReal != null ? (
                    <div className="rounded-xl border border-[#eadcc2] bg-white p-2 col-span-2">
                      <p className="text-[10px] text-[#8a7456]">GMQ réel / cible</p>
                      <p className="font-black text-[#2f2415]">{fmtNumber(row.gmqReal)} g/j · cible {fmtNumber(row.gmqTarget)} g/j</p>
                    </div>
                  ) : null}
                </div>
                {row.feedOvercostFcfa > 0 ? (
                  <p className="text-xs text-amber-800 rounded-xl border border-amber-200 bg-amber-50 p-2">
                    Surcoût alimentaire estimé : <b>{fmtCurrency(row.feedOvercostFcfa)}</b>
                    {row.delayDays ? ` · retard ~${row.delayDays} j` : ''}
                  </p>
                ) : null}
                {row.correlation ? (
                  <p className="text-xs text-red-800 rounded-xl border border-red-200 bg-red-50 p-2">
                    Baisse ponte &gt;3% / 48h ({fmtNumber(row.drop48h)} pts) — {row.correlation.hypothesis}
                  </p>
                ) : null}
                <button type="button" onClick={() => onNavigate?.('elevage', { tab: row.workshop === 'pondeuses' ? 'Production' : 'Avicole' })} className="text-xs font-black text-[#9a6b12]">
                  Ouvrir Élevage →
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8a7456]">Aucun lot avicole/bovin actif — créez des lots avec code souche pour activer le suivi.</p>
        )}
      </Section>

      <Section
        title="Financier & prix — CA, marge et Prix Recommandé ERP"
        subtitle="Objectifs mensuels par atelier croisés avec ventes réelles et algorithme Prix Plancher / Saisonnalité / Marché local."
      >
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Kpi label="Atteinte globale" value={`${financial.global?.attainment ?? 0}%`} />
          <Kpi label="CA réalisé mois" value={fmtCurrency(financial.global?.realized)} />
          <Kpi label="Encaissement" value={`${financial.global?.cashRate ?? 0}%`} />
          <Kpi label="Alertes mévente" value={mispricing.length} danger={mispricing.length > 0} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#8a7456] border-b border-[#eadcc2]">
                <th className="py-2 pr-3">Atelier</th>
                <th className="py-2 pr-3">CA objectif</th>
                <th className="py-2 pr-3">CA réel</th>
                <th className="py-2 pr-3">Marge obj.</th>
                <th className="py-2 pr-3">Marge réelle</th>
                <th className="py-2 pr-3">Prix recommandé</th>
                <th className="py-2">Pratiqué</th>
              </tr>
            </thead>
            <tbody>
              {workshops.map((ws) => (
                <tr key={ws.key} className="border-b border-[#eadcc2]/60">
                  <td className="py-3 pr-3 font-black text-[#2f2415]">{ws.label}</td>
                  <td className="py-3 pr-3">{fmtCurrency(ws.caTargetMonth)}</td>
                  <td className="py-3 pr-3">{fmtCurrency(ws.caRealized)}</td>
                  <td className="py-3 pr-3">{fmtCurrency(ws.marginTargetMonth)}</td>
                  <td className="py-3 pr-3">{fmtCurrency(ws.marginRealized)}</td>
                  <td className="py-3 pr-3 font-black text-emerald-700">{fmtCurrency(ws.pricing?.recommendedPrice)}</td>
                  <td className="py-3">{fmtCurrency(ws.pricing?.practicedPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {mispricing.map((p) => (
          <div key={p.activity} className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            <b>{p.activity}</b> — {p.mispricingMessage} (plancher {fmtCurrency(p.floorPrice)} &gt; marché ajusté {fmtCurrency(p.adjustedMarketPrice)})
          </div>
        ))}
      </Section>
    </div>
  );
}

function Kpi({ label, value, danger = false }) {
  return (
    <div className={`rounded-2xl border p-3 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
      <p className="text-[10px] text-[#8a7456]">{label}</p>
      <p className={`text-xl font-black ${danger ? 'text-red-700' : 'text-[#2f2415]'}`}>{value}</p>
    </div>
  );
}
