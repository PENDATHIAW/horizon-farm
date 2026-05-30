import { BarChart3 } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { Empty, Row, Section, Stat } from './visionUtils';

export default function VisionPerformanceTab({ data }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Stat label="Chiffre d'affaires" value={fmtCurrency(data.salesAmount)} tone="good" />
        <Stat label="Encaissements réels" value={fmtCurrency(data.collected)} tone="good" />
        <Stat label="Recettes compta" value={fmtCurrency(data.income)} tone="good" />
        <Stat label="Charges" value={fmtCurrency(data.expenses)} tone="warn" />
        <Stat label="Marge brute" value={fmtCurrency(data.grossMargin)} tone={data.grossMargin >= 0 ? 'good' : 'bad'} />
        <Stat label="Créances" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} />
      </div>
      <Section icon={BarChart3} title="Lecture rapide de la ferme">
        <Row title="Commercial" detail={`${fmtNumber(data.sales.length)} vente(s), ${fmtNumber(data.clients.length)} client(s)`} value={fmtCurrency(data.salesAmount)} tone="good" />
        <Row title="Encaissements" detail={`${fmtCurrency(data.collected)} encaissés · ${fmtCurrency(data.receivable)} reste à encaisser`} value={data.receivable ? 'À relancer' : 'OK'} tone={data.receivable ? 'warn' : 'good'} />
        <Row title="Production" detail={`${fmtNumber(data.animaux.length)} animaux, ${fmtNumber(data.lots.length)} lots`} value="Suivi" />
        <Row title="Dettes / charges" detail={`Charges ${fmtCurrency(data.expenses)}`} value={data.expenses > data.income ? 'Tension' : 'Stable'} tone={data.expenses > data.income ? 'warn' : 'good'} />
        {!data.sales.length && !data.income ? <Empty>Ajoutez des ventes et transactions pour enrichir la performance.</Empty> : null}
      </Section>
    </div>
  );
}
