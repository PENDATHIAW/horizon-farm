import { Handshake } from 'lucide-react';
import { fmtCurrency } from '../../utils/format.js';
import { AchatsStockSection } from './achatsStockUi.jsx';

export default function AchatsStockSupplierDebtsPanel({ suppliers = [], onRelance, busyId }) {
  if (!suppliers.length) return null;

  return (
    <AchatsStockSection title="Dettes à planifier" subtitle="Relances et paiements — détail complet dans la liste fournisseurs ci-dessous.">
      <div className="divide-y divide-[#eadcc2]/60">
        {suppliers.map((s) => (
          <div key={s.id || s.name} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-[#2f2415] flex items-center gap-2">
                <Handshake size={14} className="text-[#9a6b12]" />
                {s.name}
              </p>
              <p className="text-xs text-[#8a7456]">Dette {fmtCurrency(s.total)}</p>
            </div>
            <button
              type="button"
              disabled={busyId === (s.id || s.name)}
              onClick={() => onRelance?.(s)}
              className="shrink-0 rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-black text-[#052e16] disabled:opacity-50"
            >
              {busyId === (s.id || s.name) ? '…' : 'Créer tâche paiement'}
            </button>
          </div>
        ))}
      </div>
    </AchatsStockSection>
  );
}
