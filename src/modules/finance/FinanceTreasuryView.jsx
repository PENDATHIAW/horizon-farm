import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo } from 'react';
import Badge from '../../components/Badge';
import DataTable from '../../components/DataTable';
import { fmtCurrency, toNumber } from '../../utils/format';
import {
  originTypeLabel,
  resolveOriginType,
  splitTreasuryTransactions,
} from '../../utils/financeTransactionMeta';

const arr = (value) => (Array.isArray(value) ? value : []);
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0);
const hasAmount = (row = {}) => Math.abs(amount(row)) > 0;
const isIn = (row = {}) => String(row.type || '').toLowerCase() === 'entree';

function treasuryColumns() {
  return [
    { key: 'date', label: 'Date', sortable: true },
    {
      key: 'libelle',
      label: 'Libellé',
      sortable: true,
      render: (row) => <span className="font-semibold text-[#2f2415]">{row.libelle || row.label || '-'}</span>,
    },
    {
      key: 'origin_type',
      label: 'Origine',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-bold text-[#8a7456]">{originTypeLabel(resolveOriginType(row))}</span>
      ),
    },
    {
      key: 'source_module',
      label: 'Module source',
      sortable: true,
      render: (row) => row.source_module || row.module_lie || '—',
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (row) => (
        <span className={`inline-flex items-center gap-1 font-semibold ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>
          {isIn(row) ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {isIn(row) ? 'reçu' : 'dépensé'}
        </span>
      ),
    },
    {
      key: 'montant',
      label: 'Montant',
      sortable: true,
      render: (row) => (
        <span className={`font-black ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>
          {isIn(row) ? '+' : '-'}
          {fmtCurrency(amount(row))}
        </span>
      ),
    },
    {
      key: 'statut',
      label: 'Statut',
      sortable: true,
      render: (row) => <Badge status={row.statut || row.status || 'paye'} />,
    },
  ];
}

export default function FinanceTreasuryView({ rows = [], loading }) {
  const { automatic, manualException } = useMemo(() => {
    const valid = arr(rows).filter(hasAmount);
    return splitTreasuryTransactions(valid);
  }, [rows]);

  const columns = useMemo(() => treasuryColumns(), []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
        <div>
          <p className="font-black text-[#2f2415]">Transactions générées automatiquement</p>
          <p className="text-sm text-[#8a7456]">
            Miroir des modules source (ventes, achats stock, workflows). Non modifiables ici — corriger à la source ou via Rapprochement.
          </p>
        </div>
        <DataTable
          title={`Automatiques (${automatic.length})`}
          rows={automatic}
          columns={columns}
          loading={loading}
          initialSortKey="date"
          searchPlaceholder="Rechercher libellé, module…"
        />
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
        <div>
          <p className="font-black text-[#2f2415]">Transactions manuelles exceptionnelles</p>
          <p className="text-sm text-[#8a7456]">
            Frais divers, ajustements et écritures hors flux métier (pas d’achat stockable ni de soin vétérinaire direct).
          </p>
        </div>
        <DataTable
          title={`Manuelles exceptionnelles (${manualException.length})`}
          rows={manualException}
          columns={columns}
          loading={loading}
          initialSortKey="date"
          searchPlaceholder="Rechercher libellé…"
        />
      </section>
    </div>
  );
}
