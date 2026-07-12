import { ExternalLink, History } from 'lucide-react';
import { t } from '../../i18n/fr/index.js';
import { JOURNAL_DATE_KEYS, recordIdOf, rowDateValue, rowModule, selectJournalEvenements } from './dataFilters.js';

function dateLabel(value) {
  if (!value) return t('shared.journal.dateInconnue');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function JournalEvenements({
  title = t('shared.journal.titre'),
  events = [],
  rows,
  farmId,
  module,
  recordType,
  recordId,
  eventTypes,
  period,
  limit = 100,
  onNavigate,
  compact = false,
  className = '',
}) {
  const selected = selectJournalEvenements({ events, rows, farmId, module, recordType, recordId, eventTypes, period, limit });

  return (
    <section className={`min-w-0 ${className}`} aria-label={title}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-black text-[#2f2415]"><History size={17} />{title}</h2>
        <span className="text-xs font-bold text-[#8a7456]">{selected.length}</span>
      </div>
      {selected.length ? (
        <ol className="divide-y divide-[#eadcc2] border-y border-[#eadcc2]">
          {selected.map((event) => {
            const source = rowModule(event);
            const label = event.title || event.name || event.event_type || t('shared.journal.evenement');
            const description = event.description || event.message || event.notes || '';
            return (
              <li key={event.event_key || event.id || `${event.event_type}-${recordIdOf(event)}-${rowDateValue(event, JOURNAL_DATE_KEYS)}`} className={compact ? 'py-2' : 'py-3'}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-[#2f2415]">{label}</p>
                    {description && !compact ? <p className="mt-1 break-words text-xs text-[#6f6048]">{description}</p> : null}
                    <p className="mt-1 text-xs text-[#8a7456]">{dateLabel(rowDateValue(event, JOURNAL_DATE_KEYS))}{source ? ` · ${source}` : ''}</p>
                  </div>
                  {source && onNavigate ? (
                    <button type="button" onClick={() => onNavigate(source, { recordId: recordIdOf(event) || undefined })} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#d6c3a0] text-[#6f6048]" title={t('shared.actions.ouvrirSource')} aria-label={t('shared.actions.ouvrirSource')}>
                      <ExternalLink size={15} />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : <p className="border-y border-[#eadcc2] py-6 text-center text-sm text-[#8a7456]">{t('commun.etats.vide')}</p>}
    </section>
  );
}
