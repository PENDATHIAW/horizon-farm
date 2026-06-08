import toast from 'react-hot-toast';
import CommercialReconciliationPanel from './CommercialReconciliationPanel.jsx';
import { buildCommercialInvestorReport, exportCommercialInvestorPdf } from '../../utils/commercialExport.js';

export default function CommercialPilotagePanel({
  data = {},
  setTab,
  periodLabel = '',
}) {
  const report = buildCommercialInvestorReport({
    orders: data.ordersAll,
    payments: data.paymentsAll,
    clients: data.clients,
    deliveries: data.deliveries,
    invoices: data.invoices,
    relanceRows: data.relanceRows,
    periodLabel,
  });

  const exportPdf = () => {
    exportCommercialInvestorPdf(report);
    toast.success('Export preuve commerciale généré');
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Preuve commerciale / investisseur</p>
            <p className="text-sm text-[#8a7456] mt-1">{report.summary}</p>
          </div>
          <button type="button" onClick={exportPdf} className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white">
            Exporter PDF investisseur
          </button>
        </div>
      </section>
      <CommercialReconciliationPanel rows={data.reconciliationRows} setTab={setTab} />
    </div>
  );
}
