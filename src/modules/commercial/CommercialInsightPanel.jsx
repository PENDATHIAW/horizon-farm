import { ArrowRight, Bot, Lightbulb, Link2, Sparkles } from 'lucide-react';
import Btn from '../../components/Btn';

const toneCls = (severity = '') => {
  const s = String(severity).toLowerCase();
  if (s.includes('crit') || s.includes('haut')) return 'border-red-200 bg-red-50 text-red-900';
  if (s.includes('moy')) return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-sky-200 bg-sky-50 text-sky-900';
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
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#9a6b12] flex items-center gap-1"><Bot size={14} /> Signaux commercial</p>
          <p className="text-sm text-[#8a7456] mt-1">Alertes et cohérence ventes — détail opportunités sur l&apos;onglet Opportunités, objectifs sur Pilotage.</p>
        </div>
        <button type="button" onClick={() => onNavigate?.('centre_ia', { tab: 'Croissance & opportunités' })} className="text-xs font-black text-[#9a6b12] underline">Centre décisionnel →</button>
      </div>

      {topFindings.length ? (
        <div className="space-y-2">
          <p className="text-xs font-black text-[#2f2415]">Alertes & actions</p>
          {topFindings.map((finding) => (
            <div key={finding.id} className={`rounded-xl border px-3 py-2 ${toneCls(finding.severity)}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black text-sm">{finding.title}</p>
                  <p className="text-xs mt-0.5 opacity-90">{finding.description || finding.message}</p>
                  {finding.recommended_action ? <p className="text-[11px] mt-1 font-bold">→ {finding.recommended_action}</p> : null}
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
          <p className="text-xs font-black text-[#2f2415] flex items-center gap-1"><Sparkles size={13} /> Prévisions</p>
          {topPredictions.map((row) => (
            <div key={row.id || row.title} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm">
              <p className="font-black text-[#2f2415]">{row.title}</p>
              <p className="text-xs text-[#8a7456] mt-1">{row.message || row.description}</p>
            </div>
          ))}
        </div>
      ) : null}

      {issues.length ? (
        <div className="space-y-2">
          <p className="text-xs font-black text-[#2f2415] flex items-center gap-1"><Lightbulb size={13} /> Cohérence ventes</p>
          {issues.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setTab?.(row.tab || 'Ventes')}
              className="w-full rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-left hover:bg-amber-50"
            >
              <p className="font-black text-sm text-[#2f2415]">{row.title}</p>
              <p className="text-xs text-[#8a7456]">{row.detail}</p>
            </button>
          ))}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-black text-[#2f2415] mb-2 flex items-center gap-1"><Link2 size={13} /> Modules liés</p>
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
              className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-left hover:border-[#c9a96a]"
            >
              <span className="text-xs font-black text-[#2f2415]">{link.label}</span>
              <span className="block text-[10px] text-[#8a7456]">{link.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
