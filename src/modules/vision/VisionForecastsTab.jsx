import { LineChart } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import HorizonForecastPanel from '../HorizonForecastPanel.jsx';
import { Btn, Empty, Row, Section, Stat } from './visionUtils';

export default function VisionForecastsTab({ data, dataMap = {}, moduleId = 'objectifs_croissance', onNavigate, onCreateTask, onCreateBusinessEvent, onRefreshTasks }) {
  const predictions = data.predictions || [];
  const recommendations = data.growthRecommendations || [];
  const nextEvents = data.growthCalendar?.next || [];
  return (
    <div className="space-y-5">
      <HorizonForecastPanel
        dataMap={dataMap}
        moduleId={moduleId}
        onNavigate={onNavigate}
        onCreateTask={onCreateTask}
        onCreateBusinessEvent={onCreateBusinessEvent}
        onRefreshTasks={onRefreshTasks}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Solde actuel" value={fmtCurrency(data.balance)} tone={data.balance >= 0 ? 'good' : 'bad'} />
        <Stat label="À encaisser" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} />
        <Stat label="Prévisions IA" value={fmtNumber(predictions.length)} tone={predictions.length ? 'warn' : 'good'} />
        <Stat label="Risques" value={fmtNumber(data.risks.length)} tone={data.risks.length ? 'warn' : 'good'} />
      </div>
      <Section icon={LineChart} title="Prévisions IA" action={onNavigate ? <Btn onClick={() => onNavigate('elevage', { tab: 'Cycles' })}>Élevage → Cycles</Btn> : null}>
        {predictions.length ? predictions.map((p) => (
          <Row
            key={p.id}
            title={p.title}
            detail={`${p.description}${p.days_left != null ? ` · horizon ${p.days_left} j` : ''}`}
            value={p.horizon || 'Prévision'}
            tone={p.severity === 'critique' || p.severity === 'haute' ? 'bad' : 'warn'}
            onClick={() => onNavigate?.(p.module || 'centre_decisionnel', { tab: p.module === 'objectifs_croissance' ? 'Performance' : undefined })}
          />
        )) : <Empty>Aucune prévision critique. Le moteur analyse stock, trésorerie et paiements en continu.</Empty>}
      </Section>
      {recommendations.length ? (
        <Section icon={LineChart} title="Recommandations croissance">
          {recommendations.slice(0, 6).map((r) => (
            <Row key={r.id || r.title} title={r.title} detail={r.recommendation || r.timing || 'Action recommandée'} value={r.priority || 'Plan'} tone={r.priority === 'haute' ? 'warn' : 'neutral'} onClick={() => onNavigate?.('centre_decisionnel', { tab: 'Cycles' })} />
          ))}
        </Section>
      ) : null}
      <Section icon={LineChart} title="Scénarios simples">
        <Row title="Trésorerie" detail="Solde + encaissements attendus" value={data.balance + data.receivable >= 0 ? 'Stable' : 'Tension'} tone={data.balance >= 0 ? 'good' : 'warn'} onClick={() => onNavigate?.('finance_pilotage')} />
        <Row title="Production" detail="Volume suivi élevage et cultures" value={fmtNumber(data.productionCount)} onClick={() => onNavigate?.('elevage')} />
        <Row title="Valeur stock" detail="Inventaire valorisé" value={fmtCurrency(data.stockValue)} onClick={() => onNavigate?.('achats_stock')} />
        {nextEvents.slice(0, 3).map((event) => (
          <Row key={event.id || event.label} title={event.label} detail={event.note || 'Calendrier commercial'} value={event.target ? fmtCurrency(event.target) : 'Marché'} onClick={() => onNavigate?.('commercial', { tab: 'Graphiques' })} />
        ))}
      </Section>
    </div>
  );
}
