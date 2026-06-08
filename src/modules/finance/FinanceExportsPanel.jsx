import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportModuleReportPdf } from '../../utils/moduleReportExports.js';

const EXPORT_KEYS = [
  { key: 'synthesis', label: 'Synthèse financière' },
  { key: 'schedule', label: 'Échéancier' },
  { key: 'profitability', label: 'Rentabilité' },
  { key: 'repayment', label: 'Capacité de remboursement' },
  { key: 'financing', label: 'Vue financement' },
];

export default function FinanceExportsPanel({ exportPayload = null }) {
  if (!exportPayload) return null;

  const handleExport = (key) => {
    const payload = exportPayload[key];
    if (!payload) {
      toast.error('Export indisponible');
      return;
    }
    try {
      exportModuleReportPdf(payload);
      toast.success('Export PDF généré');
    } catch (e) {
      toast.error(e.message || 'Échec export');
    }
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Download size={20} className="text-[#9a6b12]" />
        <div>
          <h2 className="text-lg font-black text-[#2f2415]">Exports financiers</h2>
          <p className="text-sm text-[#8a7456]">PDF simples réutilisant le moteur d'export module.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {EXPORT_KEYS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleExport(key)}
            className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-white"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
