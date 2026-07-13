import {  Bot, Lightbulb, Link2, Sparkles } from 'lucide-react';
import Btn from '../../components/Btn';

const toneCls = (severity = '') => {
  const s = String(severity).toLowerCase();
  if (s.includes('crit') || s.includes('haut')) return 'border-urgent bg-urgent-bg text-urgent';
  if (s.includes('moy')) return 'border-vigilance bg-vigilance-bg text-horizon-dark';
  return 'border-line bg-neutral-bg text-neutral';
};

const MODULE_LINKS = [
  { key: 'finance_pilotage', label: 'Finance & trésorerie', hint: 'Encaissements, créances globales' },
  { key: 'elevage', label: 'Élevage', hint: 'Lots, animaux, coûts de production' },
  { key: 'achats_stock', label: 'Stock', hint: 'Produits finis, viande, disponibilités' },
  { key: 'activite_suivi', label: 'Tâches & relances', hint: 'Suivi opérationnel' },
  { key: 'centre_ia', label: 'Centre décisionnel', hint: 'Analyses et recommandations' },
];

export default function CommercialInsightPanel({
  findings = [],
  predictions = [],
  coherenceRows = [],
  onApplyFinding,
  onNavigate,
  setTab,
  busyId,
}) {
  const topFindings = findings.slice(0, 4);
  const topPredictions = predictions.slice(0, 3);
  const issues = coherenceRows.slice(0, 4);

  if (!topFindings.length && !topPredictions.length && !issues.length) return null;

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-meta font-semibold uppercase tracking-normal text-horizon-dark flex items-center gap-1"><Bot size={14} /> Signaux commercial</p>
          <p className="text-sm text-slate mt-1">Alertes et cohérence ventes - détail opportunités sur l&apos;onglet Opportunités, objectifs sur Pilotage.</p>
        </div>
        <button type="button" onClick={() => onNavigate?.('centre_ia', { tab: 'Croissance & opportunités' })} className="text-xs font-semibold text-horizon-dark underline">Centre décisionnel →</button>
      </div>

      {topFindings.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-earth">Alertes & actions</p>
          {topFindings.map((finding) => (
            <div key={finding.id} className={`rounded-xl border px-3 py-2 ${toneCls(finding.severity)}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-sm">{finding.title}</p>
                  <p className="text-xs mt-1 opacity-90">{finding.description || finding.message}</p>
                  {finding.recommended_action ? <p className="text-meta mt-1 font-semibold">→ {finding.recommended_action}</p> : null}
                </div>
                {finding.auto_action ? (
                  <Btn variant="outline" small disabled={busyId === finding.id} onClick={() => onApplyFinding?.(finding)}>
                    {finding.auto_action === 'create_task' ? 'Créer tâche' : 'Appliquer'}
                  </Btn>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {topPredictions.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-earth flex items-center gap-1"><Sparkles size={13} /> Prévisions</p>
          {topPredictions.map((row) => (
            <div key={row.id || row.title} className="rounded-xl border border-line bg-card px-3 py-2 text-sm">
              <p className="font-semibold text-earth">{row.title}</p>
              <p className="text-xs text-slate mt-1">{row.message || row.description}</p>
            </div>
          ))}
        </div>
      ) : null}

      {issues.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-earth flex items-center gap-1"><Lightbulb size={13} /> Cohérence ventes</p>
          {issues.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setTab?.(row.tab || 'Ventes')}
              className="w-full rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2 text-left hover:bg-vigilance-bg"
            >
              <p className="font-semibold text-sm text-earth">{row.title}</p>
              <p className="text-xs text-slate">{row.detail}</p>
            </button>
          ))}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold text-earth mb-2 flex items-center gap-1"><Link2 size={13} /> Modules liés</p>
        <div className="flex flex-wrap gap-2">
          {MODULE_LINKS.map((link) => (
            <button
              key={link.key}
              type="button"
              title={link.hint}
              onClick={() => {
                if (link.key === 'finance_pilotage') onNavigate?.('finance_pilotage', { tab: 'Créances' });
                else onNavigate?.(link.key);
              }}
              className="rounded-xl border border-line bg-card px-3 py-2 text-left hover:border-horizon"
            >
              <span className="text-xs font-semibold text-earth">{link.label}</span>
              <span className="block text-meta text-slate">{link.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
