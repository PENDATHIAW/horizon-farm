import { ArrowRight, Handshake } from 'lucide-react';
import ModuleListHub from '../../components/module/ModuleListHub.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { FinanceSection } from './financeUi.jsx';

export default function FinanceDettesPanel({ data, onNavigate }) {
  const payables = data.payables || [];

  return (
    <div className="space-y-4">
      <FinanceSection
        title="Paiements fournisseurs"
        subtitle="Planification dettes et documents sur Achats & Stock → Fournisseurs."
      >
        <button
          type="button"
          onClick={() => onNavigate?.('achats_stock', { tab: 'Fournisseurs' })}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2f2415] px-4 py-2.5 text-sm font-black text-white"
        >
          <Handshake size={14} />
          Achats & Stock → Fournisseurs
          <ArrowRight size={14} />
        </button>
      </FinanceSection>

      <ModuleListHub
        title="Dettes fournisseurs"
        intro="Achats et charges restant à payer — suivi opérationnel sur Achats & Stock."
        stats={[
          { label: 'Dettes', value: fmtNumber(payables.length), tone: payables.length ? 'warn' : 'good' },
          { label: 'Montant', value: fmtCurrency(data.payableAmount), tone: 'warn' },
          { label: 'Fournisseurs', value: fmtNumber(data.suppliers?.length || 0) },
          { label: 'Dettes fiches', value: fmtCurrency(data.supplierDebt), tone: data.supplierDebt ? 'warn' : 'good' },
        ]}
        rows={payables.map((row) => ({
          id: row.id || row.title,
          title: row.title,
          detail: row.detail,
          value: fmtCurrency(row.amount),
          onClick: () => onNavigate?.('achats_stock', { tab: 'Fournisseurs' }),
        }))}
        emptyLabel="Aucune dette ouverte."
        onNavigate={onNavigate}
      />
    </div>
  );
}
