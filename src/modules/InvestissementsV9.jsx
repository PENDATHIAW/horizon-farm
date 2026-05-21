import FinancialPlanPanel from './FinancialPlanPanel.jsx';
import InvestissementsV8 from './InvestissementsV8.jsx';

export default function InvestissementsV9(props) {
  return <div className="space-y-6"><FinancialPlanPanel {...props} /><InvestissementsV8 {...props} /></div>;
}
