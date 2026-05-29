import { ShieldAlert } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { Empty, Pill, Row, Section, Stat } from './visionUtils';

export default function VisionRisksTab({ data, onNavigate }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Risques ouverts" value={fmtNumber(data.risks.length)} tone={data.risks.length ? 'warn' : 'good'} />
        <Stat label="Critiques" value={fmtNumber(data.risks.filter((r) => r.tone === 'bad').length)} tone={data.risks.some((r) => r.tone === 'bad') ? 'bad' : 'good'} />
        <Stat label="Impact finance" value={fmtCurrency(Math.max(0, -data.balance) + data.receivable)} tone={(data.balance < 0 || data.receivable > 0) ? 'warn' : 'good'} />
        <Stat label="Preuves manquantes" value={fmtNumber(data.missingProof)} tone={data.missingProof ? 'warn' : 'good'} />
      </div>
      <Section icon={ShieldAlert} title="Registre des risques">
        {data.risks.length ? data.risks.map((r) => (
          <Row key={r.id} title={`${r.domain} · ${r.title}`} detail={`${r.cause} → ${r.impact}. Gravité ${r.severity} · Probabilité ${r.probability} · Impact ${r.financialImpact} · Resp. ${r.owner} · Échéance ${r.due}`} tone={r.tone} onClick={() => onNavigate?.(r.module)} actions={<>
            <Pill tone={r.tone}>{r.severity}</Pill>
            <Pill>{r.resolutionStatus}</Pill>
            <button type="button" onClick={() => onNavigate?.(r.module)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Voir source</button>
          </>} />
        )) : <Empty>Aucun risque majeur détecté.</Empty>}
      </Section>
    </div>
  );
}
