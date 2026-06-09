import { Bot } from 'lucide-react';
import Btn from '../../components/Btn';
import { navigateForIaFinding } from '../../utils/commercialNavigation';

const toneCls = (severity = '') => {
  const s = String(severity).toLowerCase();
  if (s.includes('crit')) return 'border-red-200 bg-red-50 text-red-900';
  if (s.includes('warn')) return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-sky-200 bg-sky-50 text-sky-900';
};

export default function ElevageInsightPanel({
  insights = [],
  onApplyFinding,
  onNavigate,
  busyId,
}) {
  const top = insights.slice(0, 6);
  if (!top.length) return null;

  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm space-y-3">
      <div>
        <p className="text-[11px] font-black uppercase tracking-wide text-[#9a6b12] flex items-center gap-1"><Bot size={14} /> IA Élevage — coûts complets</p>
        <p className="text-xs text-[#8a7456] mt-1">Recommandations basées sur alimentation + santé + mortalité — sans inventer si données manquantes.</p>
      </div>
      <div className="space-y-2">
        {top.map((finding) => (
          <div key={finding.id} className={`rounded-xl border px-3 py-2 ${toneCls(finding.severity)}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-black text-sm">{finding.title}</p>
                <p className="text-xs mt-0.5 opacity-90">{finding.description}</p>
                {finding.recommended_action ? <p className="text-[11px] mt-1 font-bold">→ {finding.recommended_action}</p> : null}
              </div>
              <div className="flex gap-2">
                <Btn variant="outline" small onClick={() => navigateForIaFinding(finding, onNavigate)}>Voir</Btn>
                {onApplyFinding ? (
                  <Btn variant="outline" small disabled={busyId === finding.id} onClick={() => onApplyFinding(finding)}>
                    {busyId === finding.id ? '…' : 'Appliquer'}
                  </Btn>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
