import { fmtCurrency, fmtNumber } from '../../utils/format';

function AlertBox({ title, message, tone = 'warn' }) {
  const cls = tone === 'bad' ? 'border-red-300 bg-red-50 text-red-800' : tone === 'good' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-800';
  return (
    <div className={`rounded-xl border p-3 text-sm ${cls}`}>
      <p className="font-black">{title}</p>
      <p className="mt-1 text-xs leading-relaxed">{message}</p>
    </div>
  );
}

export default function CrossAnalyticsSections({ cross = {} }) {
  const vet = cross.veterinaires?.insights || [];
  const feedAlerts = cross.feedInflation?.alerts || [];
  const seasonality = cross.seasonality?.insights || [];
  const shrinkage = cross.shrinkage?.alerts || [];
  const clientInsights = cross.clientQuality?.insights || [];
  const clientRanking = cross.clientQuality?.clientRanking || [];

  if (!vet.length && !feedAlerts.length && !seasonality.length && !shrinkage.length && !clientInsights.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      {vet.length ? (
        <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
          <h4 className="font-black text-[#2f2415]">Performance vétérinaire — coût vs délai de guérison</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {vet.map((v) => (
              <AlertBox key={v.id} title={`${v.intervention} — ${v.bestVet}`} message={v.message} tone={v.alert ? 'good' : 'warn'} />
            ))}
          </div>
        </section>
      ) : null}

      {feedAlerts.length ? (
        <section className="rounded-3xl border border-red-200 bg-red-50/40 p-5 shadow-sm space-y-3">
          <h4 className="font-black text-red-900">Alerte inflation aliment (+10 %)</h4>
          {feedAlerts.map((a) => (
            <AlertBox key={a.id} title={a.product} message={a.message} tone="bad" />
          ))}
        </section>
      ) : null}

      {seasonality.length ? (
        <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
          <h4 className="font-black text-[#2f2415]">Saisonnalité météo vs performance</h4>
          {seasonality.map((s) => (
            <AlertBox key={s.id} title={s.type === 'alerte_immédiate' ? 'Alerte chaleur' : 'Tendance saisonnière'} message={s.message} tone={s.type === 'alerte_immédiate' ? 'bad' : 'warn'} />
          ))}
          {(cross.seasonality?.rows || []).length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#8a7456] border-b border-[#eadcc2]">
                    <th className="py-1 text-left">Mois</th>
                    <th className="py-1 text-right">Ponte %</th>
                    <th className="py-1 text-right">IC proxy</th>
                    <th className="py-1 text-right">Mortalité</th>
                  </tr>
                </thead>
                <tbody>
                  {cross.seasonality.rows.slice(-6).map((r) => (
                    <tr key={r.month} className={r.alert ? 'bg-amber-50' : ''}>
                      <td className="py-1">{r.monthLabel}</td>
                      <td className="py-1 text-right">{r.layingRate || '—'}%</td>
                      <td className="py-1 text-right">{r.icProxy ?? '—'}</td>
                      <td className="py-1 text-right">{r.mortality}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      {shrinkage.length ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm space-y-3">
          <h4 className="font-black text-amber-900">Démarque — stock théorique vs réel</h4>
          {shrinkage.map((s) => (
            <AlertBox key={s.id} title={s.lotName || s.type} message={s.message} tone="warn" />
          ))}
        </section>
      ) : null}

      {(clientInsights.length || clientRanking.length) ? (
        <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
          <h4 className="font-black text-[#2f2415]">Qualité lots par client</h4>
          {clientInsights.map((c) => (
            <AlertBox key={c.id} title={c.clientName} message={c.message} tone="warn" />
          ))}
          {clientRanking.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#8a7456] border-b border-[#eadcc2]">
                    <th className="py-1 text-left">Client</th>
                    <th className="py-1 text-right">Commandes</th>
                    <th className="py-1 text-right">CA</th>
                    <th className="py-1 text-right">Alertes</th>
                  </tr>
                </thead>
                <tbody>
                  {clientRanking.slice(0, 5).map((c) => (
                    <tr key={c.client}>
                      <td className="py-1 font-black">{c.client}</td>
                      <td className="py-1 text-right">{c.orders}</td>
                      <td className="py-1 text-right">{fmtCurrency(c.revenue)}</td>
                      <td className="py-1 text-right">{c.alerts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
