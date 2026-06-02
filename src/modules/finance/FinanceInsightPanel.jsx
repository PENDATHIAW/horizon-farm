import { Bot, Lightbulb, Link2, Sparkles } from 'lucide-react';
import Btn from '../../components/Btn.jsx';
import { coherenceRowTab } from './financeMetrics.js';

const toneCls = (severity = '') => {
  const s = String(severity).toLowerCase();
  if (s.includes('crit') || s.includes('haut')) return 'border-red-200 bg-red-50 text-red-900';
  if (s.includes('moy')) return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-sky-200 bg-sky-50 text-sky-900';
};

const MODULE_LINKS = [
  { key: 'commercial', label: 'Commercial', tab: 'Ventes', hint: 'Encaissements, livraisons, créances clients' },
  { key: 'achats_stock', label: 'Achats & Stock', tab: 'Fournisseurs', hint: 'Dettes fournisseurs, achats' },
  { key: 'documents_rapports', label: 'Documents', hint: 'Justificatifs et pièces comptables' },
  { key: 'objectifs_croissance', label: 'Objectifs', tab: 'Financeurs', hint: 'Plans, financements, rentabilité' },
  { key: 'centre_ia', label: 'Centre IA', tab: 'Performance', hint: 'Analyses financières globales' },
];

export default function FinanceInsightPanel({
  findings = [],
  predictions = [],
  coherenceRows = [],
  onApplyFinding,
  onNavigate,
  setTab,
  busyId,
}) {
  const topFindings = findings.slice(0, 4);
  const topPredictions = predictions.slice(0, 2);
  const issues = coherenceRows.slice(0, 4);

  if (!topFindings.length && !topPredictions.length && !issues.length) return null;

  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#9a6b12] flex items-center gap-1">
            <Bot size={14} /> Pilotage IA finance
          </p>
          <p className="text-sm text-[#8a7456] mt-1">
            Signaux terrain — synthèse trésorerie, rentabilité et risques sur Centre décisionnel.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('centre_ia', { tab: 'Performance' })}
          className="text-xs font-black text-[#9a6b12] underline"
        >
          Centre décisionnel →
        </button>
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
                  {finding.recommended_action ? (
                    <p className="text-[11px] mt-1 font-bold">→ {finding.recommended_action}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {finding.module === 'commercial' ? (
                    <Btn variant="outline" small onClick={() => onNavigate?.('commercial', { tab: 'Clients' })}>
                      Commercial
                    </Btn>
                  ) : null}
                  {finding.auto_action ? (
                    <Btn variant="outline" small disabled={busyId === finding.id} onClick={() => onApplyFinding?.(finding)}>
                      {finding.auto_action === 'create_task' ? 'Créer tâche' : 'Appliquer'}
                    </Btn>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {topPredictions.length ? (
        <div className="space-y-2">
          <p className="text-xs font-black text-[#2f2415] flex items-center gap-1">
            <Sparkles size={13} /> Prévisions
          </p>
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
          <p className="text-xs font-black text-[#2f2415] flex items-center gap-1">
            <Lightbulb size={13} /> Cohérence finance
          </p>
          {issues.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                if (row.type === 'creance') onNavigate?.('commercial', { tab: 'Ventes' });
                else setTab?.(coherenceRowTab(row));
              }}
              className="w-full rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-left hover:bg-amber-50"
            >
              <p className="font-black text-sm text-[#2f2415]">{row.title}</p>
              <p className="text-xs text-[#8a7456]">{row.detail}</p>
            </button>
          ))}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-black text-[#2f2415] mb-2 flex items-center gap-1">
          <Link2 size={13} /> Modules liés
        </p>
        <div className="flex flex-wrap gap-2">
          {MODULE_LINKS.map((link) => (
            <button
              key={link.key}
              type="button"
              title={link.hint}
              onClick={() => onNavigate?.(link.key, link.tab ? { tab: link.tab } : undefined)}
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
