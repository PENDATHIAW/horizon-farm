import { fmtCurrency, fmtNumber } from '../../utils/format';

export default function EfficaciteTechniqueTab({ analytics = {}, onNavigate }) {
  const rows = analytics.technical?.rows || [];
  const thermalAlerts = analytics.technical?.thermalAlerts || [];

  return (
    <div className="space-y-6">
      {thermalAlerts.map((t) => (
        <div key={t.lotId} className="rounded-2xl border border-red-400 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-black">{t.thermal.status} — {t.lotName}</p>
          <p className="mt-1">{t.thermal.message}</p>
          <p className="mt-1 text-xs">Perte estimée : {fmtCurrency(t.thermal.perte_financiere_fcfa)}/jour · {fmtNumber(t.thermal.oeufs_perdus)} œufs/j</p>
        </div>
      ))}

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-black text-[#2f2415]">Efficacité technique & conversion</h3>
          <p className="text-sm text-[#8a7456]">IC, ponte réelle vs souche, GMQ vs coût du jour — alertes avant surcoût.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#8a7456] border-b border-[#eadcc2]">
                <th className="py-2 pr-2">Lot</th>
                <th className="py-2 pr-2">J+</th>
                <th className="py-2 pr-2">IC</th>
                <th className="py-2 pr-2">Ponte réelle</th>
                <th className="py-2 pr-2">Objectif souche</th>
                <th className="py-2 pr-2">GMQ (g/j)</th>
                <th className="py-2">Décision</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.lotId} className={`border-b border-[#eadcc2]/50 ${row.ponteAlert || row.icAlert || row.gmqAlert ? 'bg-amber-50/60' : ''}`}>
                  <td className="py-2 pr-2 font-black">{row.lotName}</td>
                  <td className="py-2 pr-2">{row.ageDays ?? '—'}</td>
                  <td className={`py-2 pr-2 ${row.icAlert ? 'text-red-700 font-black' : ''}`}>{row.ic ?? '—'}{row.icTarget ? ` (cible ~${row.icTarget})` : ''}</td>
                  <td className={`py-2 pr-2 ${row.ponteAlert ? 'text-red-700 font-black' : ''}`}>{row.realPonte != null ? `${row.realPonte}%` : '—'}</td>
                  <td className="py-2 pr-2">{row.theoreticalPonte != null ? `${row.theoreticalPonte}%` : '—'}</td>
                  <td className="py-2 pr-2">{row.gmq ?? '—'}</td>
                  <td className="py-2 text-xs text-[#7d6a4a]">{row.optimalSaleHint || (row.ponteAlert ? 'Écart ponte > 3 pts' : '—')}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr><td colSpan={7} className="py-4 text-[#8a7456]">Aucun lot actif — saisissez production et alimentation.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => onNavigate?.('elevage', { tab: 'Production' })} className="text-xs font-black text-[#9a6b12]">Ouvrir Élevage →</button>
      </section>
    </div>
  );
}
