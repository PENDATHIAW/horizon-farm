import { Handshake } from 'lucide-react';
import { fmtCurrency } from '../../utils/format.js';
import { AchatsStockSection } from './achatsStockUi.jsx';

export default function AchatsStockSupplierDebtsPanel({ suppliers = [], onRelance, busyId }) {
  if (!suppliers.length) return null;

  return (
    <AchatsStockSection title="Dettes à planifier" subtitle="Relances et paiements - détail complet dans la liste fournisseurs ci-dessous.">
      <div className="divide-y divide-line/60">
        {suppliers.map((s) => (
          <div key={s.id || s.name} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-earth flex items-center gap-2">
                <Handshake size={14} className="text-horizon-dark" />
                {s.name}
              </p>
              <p className="text-xs text-slate">Dette {fmtCurrency(s.total)}</p>
            </div>
            <button
              type="button"
              disabled={busyId === (s.id || s.name)}
              onClick={() => onRelance?.(s)}
              className="shrink-0 rounded-lg bg-leaf px-3 py-2 text-xs font-semibold text-earth disabled:opacity-50"
            >
              {busyId === (s.id || s.name) ? '…' : 'Créer tâche paiement'}
            </button>
          </div>
        ))}
      </div>
    </AchatsStockSection>
  );
}
