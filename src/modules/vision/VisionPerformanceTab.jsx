import { BarChart3 } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { Empty, Row, Section, Stat } from './visionUtils';

export default function VisionPerformanceTab({ data, onNavigate }) {
  return (
    <div className="space-y-5">
      {data.periodFiltered && data.periodLabel ? (
        <p className="text-sm text-[#8a7456]">Flux CA / charges / encaissements sur <b className="text-[#2f2415]">{data.periodLabel}</b> — créances sur l&apos;historique complet.</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-7">
        <Stat label="Chiffre d'affaires" value={fmtCurrency(data.salesAmount)} tone="good" />
        <Stat label="Encaissements réels" value={fmtCurrency(data.collected)} tone="good" />
        <Stat label="Recettes compta" value={fmtCurrency(data.income)} tone="good" />
        <Stat label="Charges" value={fmtCurrency(data.expenses)} tone="warn" />
        <Stat label="Marge brute" value={fmtCurrency(data.grossMargin)} tone={data.grossMargin >= 0 ? 'good' : 'bad'} />
        <Stat label="Créances" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} />
        <Stat label="Marges non fiables" value={fmtNumber(data.unreliableMargins || 0)} tone={data.unreliableMargins ? 'warn' : 'good'} />
      </div>
      {data.unreliableMargins > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <b>{data.unreliableMargins}</b> marge(s) masquée(s) — coûts incomplets. Complétez alimentation, santé, transport et revenus avant pilotage rentabilité.
          <button type="button" onClick={() => onNavigate?.('elevage')} className="ml-2 rounded-lg border border-amber-300 px-2 py-1 text-xs font-black">Élevage</button>
        </div>
      ) : null}
      <Section icon={BarChart3} title="Lecture rapide de la ferme">
        <Row title="Commercial" detail={`${fmtNumber(data.sales.length)} vente(s), ${fmtNumber(data.clients.length)} client(s)`} value={fmtCurrency(data.salesAmount)} tone="good" onClick={() => onNavigate?.('commercial')} />
        <Row title="Encaissements" detail={`${fmtCurrency(data.collected)} encaissés · ${fmtCurrency(data.receivable)} reste à encaisser`} value={data.receivable ? 'À relancer' : 'OK'} tone={data.receivable ? 'warn' : 'good'} onClick={() => onNavigate?.('finance_pilotage')} />
        <Row title="Production" detail={`${fmtNumber(data.animaux.length)} animaux, ${fmtNumber(data.lots.length)} lots`} value="Suivi" onClick={() => onNavigate?.('elevage')} />
        <Row title="Dettes / charges" detail={`Charges ${fmtCurrency(data.expenses)}`} value={data.expenses > data.income ? 'Tension' : 'Stable'} tone={data.expenses > data.income ? 'warn' : 'good'} onClick={() => onNavigate?.('finance_pilotage')} />
        {!data.sales.length && !data.income ? <Empty>Ajoutez des ventes et transactions pour enrichir la performance.</Empty> : null}
      </Section>
    </div>
  );
}
