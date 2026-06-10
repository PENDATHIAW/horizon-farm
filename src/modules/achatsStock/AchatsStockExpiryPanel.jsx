import { AlertTriangle, ShoppingBag, Trash2 } from 'lucide-react';
import { fmtNumber } from '../../utils/format.js';
import { EXPIRY_RISK_LEVELS } from '../../utils/stockExpiry.js';
import { AchatsStockSection, AchatsStockTodoRow } from './achatsStockUi.jsx';

const riskTone = (risk = '') => {
  if (risk === EXPIRY_RISK_LEVELS.expired) return 'text-red-700 bg-red-50 border-red-200';
  if (risk === EXPIRY_RISK_LEVELS.critical) return 'text-red-700 bg-red-50 border-red-200';
  if (risk === EXPIRY_RISK_LEVELS.warning) return 'text-amber-800 bg-amber-50 border-amber-200';
  return 'text-sky-800 bg-sky-50 border-sky-200';
};

export default function AchatsStockExpiryPanel({ expiry = {}, setTab, onNavigate, onMarkLoss, busyId }) {
  const rows = expiry.all || [];
  if (!rows.length) return null;

  return (
    <AchatsStockSection title="Péremption & DLC" subtitle="Produits frais à traiter — aucune suppression automatique.">
      <div className="space-y-2">
        {rows.slice(0, 8).map((row) => (
          <div key={row.id} className={`rounded-xl border px-3 py-2 ${riskTone(row.risk)}`}>
            <AchatsStockTodoRow
              title={row.label}
              detail={`DLC ${row.dlc || '—'} · ${row.daysLeft != null ? `${row.daysLeft} j` : 'DLC manquante'} · ${fmtNumber(row.qty)} ${row.unit}`}
              actionLabel={
                row.recommended?.action === 'mark_loss' ? 'Marquer perte'
                  : row.recommended?.action === 'quick_sale' || row.recommended?.action === 'promote_sale' ? 'Vendre'
                    : row.recommended?.action === 'create_alert' ? 'Alerte' : null
              }
              busy={busyId === row.id}
              onOpen={() => setTab?.('Stock')}
              onAction={() => {
                if (row.recommended?.action === 'mark_loss') onMarkLoss?.(row);
                else if (row.recommended?.action === 'quick_sale' || row.recommended?.action === 'promote_sale') {
                  onNavigate?.('commercial', { tab: 'Opportunités' });
                } else if (row.recommended?.action === 'create_alert') {
                  onMarkLoss?.(row, { alertOnly: true });
                } else setTab?.('Stock');
              }}
            />
            <p className="text-[11px] font-bold mt-1 flex items-center gap-1">
              {row.risk === EXPIRY_RISK_LEVELS.expired ? <Trash2 size={12} /> : <AlertTriangle size={12} />}
              {row.recommended?.label}
              {row.vendable ? <ShoppingBag size={12} className="ml-2" /> : null}
            </p>
          </div>
        ))}
      </div>
    </AchatsStockSection>
  );
}
