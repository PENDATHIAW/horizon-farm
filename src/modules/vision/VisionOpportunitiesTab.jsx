import { TrendingUp } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { dateOf, Empty, label, Row, Section } from './visionUtils';

export default function VisionOpportunitiesTab({ data }) {
  return (
    <Section icon={TrendingUp} title="Ce qui peut faire gagner plus">
      {data.opportunities.length ? data.opportunities.slice(0, 12).map((r) => (
        <Row key={r.id || label(r)} title={label(r)} detail={`${r.client_nom || r.customer_name || r.notes || 'Opportunité'} · ${dateOf(r)} · prob. ${r.probability || r.probabilite || '—'}%`} value={fmtCurrency(r.montant_estime || r.estimated_amount || r.montant || 0)} tone="good" />
      )) : <Empty>Aucune opportunité ouverte.</Empty>}
    </Section>
  );
}
