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
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-earth">Filtres graphiques</p>
          <p className="text-xs text-slate">
            {filteredCount}/{totalCount} vente(s) affichée(s)
            {periodLabel ? ' · période ERP ci-dessous' : ''}
          </p>
        </div>
        {periodLabel ? <PeriodScopeBadge label={periodLabel} /> : null}
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <label className="text-xs font-semibold text-slate">
          Client
          <select
            value={filters.clientId || ''}
            onChange={(e) => set('clientId', e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth"
          >
            <option value="">Tous les clients</option>
            {(options.clients || []).map((row) => (
              <option key={row.value} value={row.value}>{row.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate">
          Activité / produit
          <select
            value={filters.activityKey || ''}
            onChange={(e) => set('activityKey', e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth"
          >
            <option value="">Toutes les activités</option>
            {(options.activities || []).map((row) => (
              <option key={row.value} value={row.value}>{row.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate">
          Produit (libellé vente)
          <select
            value={filters.productName || ''}
            onChange={(e) => set('productName', e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth"
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
          className="text-xs font-semibold text-horizon-dark"
        >
          Réinitialiser les filtres
        </button>
      ) : null}
    </section>
  );
}
