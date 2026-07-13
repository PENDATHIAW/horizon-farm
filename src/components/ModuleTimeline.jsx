import { Clock, FileText, RefreshCw } from 'lucide-react';

const arr = (value) => Array.isArray(value) ? value : [];
const dateOf = (row = {}) => row.date || row.event_date || row.created_at || row.updated_at || row.due_date || row.timestamp || row.synced_at || '';
const titleOf = (row = {}) => row.title || row.nom || row.name || row.libelle || row.action || row.event_type || row.type || row.id || 'Événement';
const descOf = (row = {}) => row.description || row.message || row.notes || row.commentaire || row.status || row.statut || row.module_source || '';
const statusOf = (row = {}) => String(row.status || row.statut || row.severity || row.priority || '').toLowerCase();
const clean = (value) => String(value || '').trim().toLowerCase();
const dayOf = (row = {}) => String(dateOf(row)).slice(0, 10);

function timelineKey(row = {}) {
  return [
    row.business_event_id || row.event_id || row.id,
    row.event_type || row.type || row.action,
    row.entity_type || row.module_source || row.module_lie,
    row.entity_id || row.related_id || row.source_record_id,
    dayOf(row),
  ].map(clean).filter(Boolean).join('|') || `${clean(titleOf(row))}|${clean(descOf(row)).slice(0, 80)}|${dayOf(row)}`;
}

function dedupeRows(rows = []) {
  const map = new Map();
  arr(rows).forEach((row) => {
    const key = timelineKey(row);
    const previous = map.get(key);
    if (!previous) map.set(key, row);
    else {
      const previousScore = Object.values(previous || {}).filter(Boolean).length;
      const nextScore = Object.values(row || {}).filter(Boolean).length;
      if (nextScore > previousScore) map.set(key, row);
    }
  });
  return Array.from(map.values());
}

function badgeClass(status) {
  if (['critique', 'critical', 'urgence', 'retard', 'error', 'failed', 'echec'].some((key) => status.includes(key))) return 'bg-urgent-bg text-urgent border-urgent';
  if (['warning', 'alerte', 'pending', 'attente', 'haute'].some((key) => status.includes(key))) return 'bg-vigilance-bg text-horizon-dark border-vigilance';
  if (['success', 'ok', 'done', 'termine', 'terminé', 'resolved', 'resolu', 'validé', 'valide'].some((key) => status.includes(key))) return 'bg-positive-bg text-positive border-positive';
  return 'bg-card text-slate border-line';
}

export default function ModuleTimeline({
  title = 'Timeline du module',
  subtitle = 'Derniers événements et décisions à suivre.',
  rows = [],
  emptyText = 'Aucun événement récent.',
  limit = 8,
  onRefresh,
  onNavigate,
  navigateLabel = 'Ouvrir le module',
}) {
  const sourceRows = arr(rows);
  const dedupedRows = dedupeRows(sourceRows);
  const duplicateCount = Math.max(0, sourceRows.length - dedupedRows.length);
  const items = dedupedRows
    .slice()
    .sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a))))
    .slice(0, limit);

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-lg font-semibold text-earth"><Clock size={20} /> {title}</p>
          <p className="mt-1 text-sm text-slate">{subtitle}</p>
          {duplicateCount ? <p className="mt-1 text-xs font-semibold text-horizon-dark">{duplicateCount} événement(s) répétitif(s) masqué(s) pour éviter les doublons.</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onRefresh ? <button type="button" onClick={onRefresh} className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-earth"><RefreshCw size={14} /> Actualiser</button> : null}
          {onNavigate ? <button type="button" onClick={onNavigate} className="inline-flex items-center gap-2 rounded-xl bg-earth px-3 py-2 text-xs font-semibold text-white"><FileText size={14} /> {navigateLabel}</button> : null}
        </div>
      </div>

      <div className="space-y-3">
        {items.length ? items.map((row, index) => {
          const status = statusOf(row);
          return (
            <div key={timelineKey(row) || row.id || `${title}-${index}`} className="relative rounded-2xl border border-line bg-card p-4 pl-6">
              <span className="absolute left-0 top-5 h-3 w-3 -translate-x-1.5 rounded-full bg-horizon ring-4 ring-white" />
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold text-earth">{titleOf(row)}</p>
                  {descOf(row) ? <p className="mt-1 text-sm text-slate">{descOf(row)}</p> : null}
                  <p className="mt-1 text-xs text-slate">{dateOf(row) || 'Date non renseignée'}</p>
                </div>
                {status ? <span className={`w-fit rounded-full border px-2 py-1 text-meta font-semibold ${badgeClass(status)}`}>{status}</span> : null}
              </div>
            </div>
          );
        }) : <div className="rounded-2xl border border-dashed border-line bg-card p-6 text-center text-sm text-slate">{emptyText}</div>}
      </div>
    </section>
  );
}
