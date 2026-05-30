import { LineChart } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { Row, Section, Stat } from './visionUtils';

export default function VisionForecastsTab({ data }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Solde actuel" value={fmtCurrency(data.balance)} tone={data.balance >= 0 ? 'good' : 'bad'} />
        <Stat label="À encaisser" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} />
        <Stat label="Valeur stock" value={fmtCurrency(data.stockValue)} />
        <Stat label="Risques" value={fmtNumber(data.risks.length)} tone={data.risks.length ? 'warn' : 'good'} />
      </div>
      <Section icon={LineChart} title="Prévisions simples">
        <Row title="Trésorerie" detail="Solde + encaissements attendus" value={data.balance + data.receivable >= 0 ? 'Stable' : 'Tension'} tone={data.balance >= 0 ? 'good' : 'warn'} />
        <Row title="Production" detail="Volume suivi élevage et cultures" value={fmtNumber(data.productionCount)} />
        <Row title="Risque opérationnel" detail="Alertes, tâches, santé, production" value={data.risks.length ? 'À suivre' : 'OK'} tone={data.risks.length ? 'warn' : 'good'} />
      </Section>
    </div>
  );
}
