import { TrendingUp } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { dateOf, Empty, label, Row, Section } from './visionUtils';

export default function VisionOpportunitiesTab({ data, onNavigate }) {
  const iaRows = data.iaOpportunities || [];
  const commercial = data.opportunities || [];
  return (
    <div className="space-y-5">
      {iaRows.length ? (
        <Section icon={TrendingUp} title="Opportunités suggérées par l'IA">
          {iaRows.map((r) => (
            <Row key={r.id} title={r.title} detail={r.notes || 'Action recommandée'} value={`${r.probability || '—'}% conf.`} tone="good" onClick={() => onNavigate?.(r.module || 'commercial')} />
          ))}
        </Section>
      ) : null}
      <Section icon={TrendingUp} title="Pipeline commercial">
        {commercial.length ? commercial.slice(0, 12).map((r) => (
          <Row key={r.id || label(r)} title={label(r)} detail={`${r.client_nom || r.customer_name || r.notes || 'Opportunité'} · ${dateOf(r)} · prob. ${r.probability || r.probabilite || '—'}%`} value={fmtCurrency(r.montant_estime || r.estimated_amount || r.montant || 0)} tone="good" onClick={() => onNavigate?.('commercial')} />
        )) : <Empty>Aucune opportunité commerciale ouverte. Les suggestions IA apparaissent quand le moteur détecte des gains possibles.</Empty>}
      </Section>
    </div>
  );
}
