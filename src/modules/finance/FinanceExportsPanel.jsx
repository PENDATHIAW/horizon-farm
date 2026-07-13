import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportModuleReportPdf } from '../../utils/moduleReportExports.js';
import { DIRECT_FINANCE_EXPORT_KEYS } from '../../utils/financePilotageV3.js';

const EXPORT_LABELS = Object.freeze({
  synthesis: 'Synthèse financière PDF',
  schedule: 'Échéancier PDF',
  repayment: 'Capacité de remboursement PDF',
  financing: 'Vue financement PDF',
});

export default function FinanceExportsPanel({ exportPayload = null, directOnly = false, compact = false }) {
  if (!exportPayload) return null;

  const keys = directOnly ? DIRECT_FINANCE_EXPORT_KEYS : Object.keys(EXPORT_LABELS);

  const handleExport = (key) => {
    const payload = exportPayload[key];
    if (!payload) {
      toast.error('Export indisponible');
      return;
    }
    try {
      exportModuleReportPdf(payload);
      toast.success('PDF téléchargé');
    } catch (e) {
      toast.error(e.message || 'Échec export');
    }
  };

  return (
    <section className={`rounded-3xl border border-line bg-white shadow-card ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-center gap-2">
        <Download size={compact ? 18 : 20} className="text-horizon-dark" />
        <div>
          <h2 className={`font-semibold text-earth ${compact ? 'text-base' : 'text-lg'}`}>
            {directOnly ? 'Exports directs PDF' : 'Exports financiers'}
          </h2>
          <p className="text-sm text-slate">
            {directOnly
              ? 'Téléchargez un fichier PDF immédiatement depuis Finance.'
              : 'PDF simples réutilisant le moteur d\'export module.'}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleExport(key)}
            className="rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-earth hover:bg-white"
          >
            {EXPORT_LABELS[key] || key}
          </button>
        ))}
      </div>
    </section>
  );
}
