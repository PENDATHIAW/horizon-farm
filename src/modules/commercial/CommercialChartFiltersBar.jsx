import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';

export default function CommercialChartFiltersBar({
  options = {},
  filters = {},
  onChange,
  periodLabel = '',
  filteredCount = 0,
  totalCount = 0,
}) {
  const set = (key, value) => onChange?.({ ...filters, [key]: value });

  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-[#2f2415]">Filtres graphiques</p>
          <p className="text-xs text-[#8a7456]">
            {filteredCount}/{totalCount} vente(s) affichée(s)
            {periodLabel ? ' · période ERP ci-dessous' : ''}
          </p>
        </div>
        {periodLabel ? <PeriodScopeBadge label={periodLabel} /> : null}
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <label className="text-xs font-bold text-[#8a7456]">
          Client
          <select
            value={filters.clientId || ''}
            onChange={(e) => set('clientId', e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-semibold text-[#2f2415]"
          >
            <option value="">Tous les clients</option>
            {(options.clients || []).map((row) => (
              <option key={row.value} value={row.value}>{row.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[#8a7456]">
          Activité / produit
          <select
            value={filters.activityKey || ''}
            onChange={(e) => set('activityKey', e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-semibold text-[#2f2415]"
          >
            <option value="">Toutes les activités</option>
            {(options.activities || []).map((row) => (
              <option key={row.value} value={row.value}>{row.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[#8a7456]">
          Produit (libellé vente)
          <select
            value={filters.productName || ''}
            onChange={(e) => set('productName', e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-semibold text-[#2f2415]"
          >
            <option value="">Tous les libellés</option>
            {(options.products || []).map((row) => (
              <option key={row.value} value={row.value}>{row.label}</option>
            ))}
          </select>
        </label>
      </div>
      {(filters.clientId || filters.activityKey || filters.productName) ? (
        <button
          type="button"
          onClick={() => onChange?.({ clientId: '', activityKey: '', productName: '' })}
          className="text-xs font-black text-[#9a6b12]"
        >
          Réinitialiser les filtres
        </button>
      ) : null}
    </section>
  );
}
