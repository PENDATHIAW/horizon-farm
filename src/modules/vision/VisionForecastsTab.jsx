import { LineChart } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { Btn, Empty, Row, Section, Stat } from './visionUtils';

export default function VisionForecastsTab({ data, onNavigate }) {
  const predictions = data.predictions || [];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Solde actuel" value={fmtCurrency(data.balance)} tone={data.balance >= 0 ? 'good' : 'bad'} />
        <Stat label="À encaisser" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} />
        <Stat label="Prévisions IA" value={fmtNumber(predictions.length)} tone={predictions.length ? 'warn' : 'good'} />
        <Stat label="Risques" value={fmtNumber(data.risks.length)} tone={data.risks.length ? 'warn' : 'good'} />
      </div>
      <Section icon={LineChart} title="Prévisions IA" action={onNavigate ? <Btn onClick={() => onNavigate('elevage', { tab: 'Cycles' })}>Cycles production</Btn> : null}>
        {predictions.length ? predictions.map((p) => (
          <Row
            key={p.id}
            title={p.title}
            detail={`${p.description}${p.days_left != null ? ` · horizon ${p.days_left} j` : ''}`}
            value={p.horizon || 'Prévision'}
            tone={p.severity === 'critique' || p.severity === 'haute' ? 'bad' : 'warn'}
            onClick={() => onNavigate?.(p.module)}
          />
        )) : <Empty>Aucune prévision critique. Le moteur analyse stock, trésorerie et paiements en continu.</Empty>}
      </Section>
      <Section icon={LineChart} title="Scénarios simples">
        <Row title="Trésorerie" detail="Solde + encaissements attendus" value={data.balance + data.receivable >= 0 ? 'Stable' : 'Tension'} tone={data.balance >= 0 ? 'good' : 'warn'} onClick={() => onNavigate?.('finance_pilotage')} />
        <Row title="Production" detail="Volume suivi élevage et cultures" value={fmtNumber(data.productionCount)} onClick={() => onNavigate?.('elevage')} />
        <Row title="Valeur stock" detail="Inventaire valorisé" value={fmtCurrency(data.stockValue)} onClick={() => onNavigate?.('achats_stock')} />
      </Section>
    </div>
  );
}
