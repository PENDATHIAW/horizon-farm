import InvestissementsV8 from './InvestissementsV8.jsx';
import InvestissementsEvolution from './InvestissementsEvolution.jsx';

export default function InvestissementsV9(props) {
  return (
    <div className="space-y-6">
      <InvestissementsV8 {...props} />
      <InvestissementsEvolution
        rows={props.rows || []}
        businessPlans={props.businessPlans || []}
        bpInvestmentLines={props.bpInvestmentLines || []}
        bpRecurringCosts={props.bpRecurringCosts || []}
        bpRevenueProjections={props.bpRevenueProjections || []}
        bpRisks={props.bpRisks || []}
        transactions={props.transactions || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
