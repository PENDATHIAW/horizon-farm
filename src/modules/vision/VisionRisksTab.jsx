import { ShieldAlert } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { Empty, Pill, Row, Section, Stat, riskLevelLabel } from './visionUtils';

export default function VisionRisksTab({ data, onNavigate }) {
  const engineRisks = data.engineRisks || [];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Stat label="Risques ouverts" value={fmtNumber(data.risks.length)} tone={data.risks.length ? 'warn' : 'good'} />
        <Stat label="Critiques / élevés" value={fmtNumber(data.risks.filter((r) => r.tone === 'bad').length)} tone={data.risks.some((r) => r.tone === 'bad') ? 'bad' : 'good'} />
        <Stat label="Indicateurs IA" value={fmtNumber(engineRisks.length)} />
        <Stat label="Impact finance" value={fmtCurrency(Math.max(0, -data.balance) + data.receivable)} tone={(data.balance < 0 || data.receivable > 0) ? 'warn' : 'good'} />
        <Stat label="Preuves manquantes" value={fmtNumber(data.missingProof)} tone={data.missingProof ? 'warn' : 'good'} />
      </div>
      {engineRisks.length ? (
        <Section icon={ShieldAlert} title="Matrice risques IA (financier · sanitaire · stock · fournisseur · client)">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {engineRisks.map((r) => (
              <button key={r.id} type="button" onClick={() => onNavigate?.(r.module)} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left hover:bg-white">
                <p className="text-xs uppercase tracking-wide text-[#8a7456]">{r.domain}</p>
                <p className="mt-1 font-black text-[#2f2415]">{r.title}</p>
                <p className="mt-1 text-xs text-[#8a7456]">{r.detail}</p>
                <div className="mt-2 flex gap-2">
                  <Pill tone={r.level === 'critique' || r.level === 'eleve' ? 'bad' : r.level === 'moyen' ? 'warn' : 'good'}>{riskLevelLabel(r.level)}</Pill>
                  <Pill>{r.score}/100</Pill>
                </div>
              </button>
            ))}
          </div>
        </Section>
      ) : null}
      <Section icon={ShieldAlert} title="Registre des risques opérationnels">
        {data.risks.length ? data.risks.map((r) => (
          <Row key={r.id} title={`${r.domain} · ${r.title}`} detail={`${r.cause} → ${r.impact}. Gravité ${r.severity} · Probabilité ${r.probability} · Impact ${r.financialImpact}`} tone={r.tone} onClick={() => onNavigate?.(r.module)} actions={<>
            <Pill tone={r.tone}>{r.severity}</Pill>
            <Pill>{r.resolutionStatus}</Pill>
            <button type="button" onClick={() => onNavigate?.(r.module)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Voir source</button>
          </>} />
        )) : <Empty>Aucun risque majeur détecté.</Empty>}
      </Section>
    </div>
  );
}
