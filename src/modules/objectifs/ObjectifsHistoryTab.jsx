const formatDateTime = (value) => {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('fr-FR');
};

export default function ObjectifsHistoryTab({ simulations = [] }) {
  const rows = [...simulations].sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
  return (
    <section aria-label="Historique des scénarios">
      {rows.length ? rows.map((row) => (
        <div key={row.id || `${row.scenario_key}-${row.version}`} className="grid gap-2 border-b border-line py-3 md:grid-cols-[1fr_auto_auto] md:items-center">
          <span>
            <strong className="block text-sm text-earth">{row.name || 'Scénario de croissance'} · v{row.version}</strong>
            <span className="text-xs text-slate">{formatDateTime(row.created_at)}</span>
          </span>
          <span className="text-sm font-semibold text-earth">{row.results?.sustainable ? 'Soutenable' : 'À ajuster'}</span>
          <span className="text-xs uppercase text-slate">{row.status || 'brouillon'}</span>
        </div>
      )) : <p className="py-8 text-center text-sm text-slate">Rien à afficher pour l’instant.</p>}
    </section>
  );
}
