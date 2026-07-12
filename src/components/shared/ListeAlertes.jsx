import { AlertTriangle, Check, ExternalLink, ListTodo } from 'lucide-react';
import { useState } from 'react';
import { t } from '../../i18n/fr/index.js';
import { alertSeverityOf, alertStatusOf, rowModule, selectListeAlertes } from './dataFilters.js';

export default function ListeAlertes({
  title = t('shared.alerts.titre'),
  alerts = [],
  alertes,
  rows,
  farmId,
  module,
  codes,
  severities,
  statuses,
  assignedTo,
  period,
  limit = 100,
  onNavigate,
  onSelect,
  onAction,
  onResolve,
  compact = false,
  className = '',
}) {
  const [busyId, setBusyId] = useState('');
  const selected = selectListeAlertes({ alerts, alertes, rows, farmId, module, codes, severities, statuses, assignedTo, period, limit });

  const run = async (alert, action) => {
    if (!action) return;
    setBusyId(String(alert.id || alert.alert_dedupe_key));
    try {
      await action(alert);
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className={`min-w-0 ${className}`} aria-label={title}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-black text-[#2f2415]"><AlertTriangle size={17} />{title}</h2>
        <span className="text-xs font-bold text-[#8a7456]">{selected.length}</span>
      </div>
      {selected.length ? (
        <ul className="divide-y divide-[#eadcc2] border-y border-[#eadcc2]">
          {selected.map((alert) => {
            const source = rowModule(alert);
            const id = String(alert.id || alert.alert_dedupe_key);
            return (
              <li key={alert.alert_dedupe_key || alert.event_key || alert.id} className={compact ? 'py-2' : 'py-3'}>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <button type="button" onClick={() => onSelect?.(alert)} className="min-w-0 flex-1 text-left disabled:cursor-default" disabled={!onSelect}>
                    <p className="break-words text-sm font-black text-[#2f2415]">{alert.title || alert.titre || alert.message || t('shared.alerts.alerte')}</p>
                    {alert.message && alert.message !== alert.title && !compact ? <p className="mt-1 break-words text-xs text-[#6f6048]">{alert.message}</p> : null}
                    <p className="mt-1 text-xs text-[#8a7456]">{alertSeverityOf(alert)} · {alertStatusOf(alert)}{source ? ` · ${source}` : ''}</p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {onAction ? <button type="button" disabled={busyId === id} onClick={() => run(alert, onAction)} className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-300 text-emerald-700 disabled:opacity-50" title={t('commun.actions.creerTache')} aria-label={t('commun.actions.creerTache')}><ListTodo size={15} /></button> : null}
                    {onResolve ? <button type="button" disabled={busyId === id} onClick={() => run(alert, onResolve)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d6c3a0] text-[#6f6048] disabled:opacity-50" title={t('shared.alerts.resoudre')} aria-label={t('shared.alerts.resoudre')}><Check size={15} /></button> : null}
                    {source && onNavigate ? <button type="button" onClick={() => onNavigate(source, { alertId: alert.id })} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d6c3a0] text-[#6f6048]" title={t('shared.actions.ouvrirSource')} aria-label={t('shared.actions.ouvrirSource')}><ExternalLink size={15} /></button> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="border-y border-[#eadcc2] py-6 text-center text-sm text-[#8a7456]">{t('commun.etats.vide')}</p>}
    </section>
  );
}
