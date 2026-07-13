import { ArrowDown, ArrowUp, Download, Edit, Eye, Package, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import DataTable from '../components/DataTable';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import EditModal from '../modals/EditModal';
import { emitHorizonForm } from '../services/formModalManager';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { governFormFields } from '../utils/formFieldGovernance';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, toNumber } from '../utils/format';
import { generateSequentialId } from '../utils/ids';
import {
  classifyOperationalChargeRedirect,
  enrichFinanceTransaction,
  financeTransactionWouldDuplicate,
  isManualExceptionFinanceTransaction,
  ORIGIN_TYPES,
} from '../utils/financeTransactionMeta';
import {
  buildStockReceptionFromFinanceTransaction,
  financeTransactionHasStockLink,
  isStockableFinanceTransaction,
} from '../utils/stockPurchaseWorkflow';

const arr = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0);
const hasAmount = (row = {}) => Math.abs(amount(row)) > 0;

const isIn = (row = {}) => String(row.type || '').toLowerCase() === 'entree';
const today = () => new Date().toISOString().slice(0, 10);


const activityLabels = {
  animaux: 'Animaux',
  avicole: 'Avicole',
  cultures: 'Cultures',
  sante: 'Santé',
  stock: 'Stock / achats',
  fournisseurs: 'Fournisseurs',
  investissements: 'Investissements',
  autres_charges: 'Autres charges',
  autres_revenus: 'Autres revenus',
};

function detectActivity(row = {}) {
  const text = `${row.categorie || ''} ${row.category || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.libelle || ''}`.toLowerCase();
  if (text.includes('animal') || text.includes('bovin') || text.includes('ovin') || text.includes('caprin')) return 'animaux';
  if (text.includes('avicole') || text.includes('poulet') || text.includes('pondeuse') || text.includes('chair') || text.includes('œuf') || text.includes('oeuf')) return 'avicole';
  if (text.includes('culture') || text.includes('récolte') || text.includes('recolte') || text.includes('semence') || text.includes('engrais')) return 'cultures';
  if (text.includes('sant') || text.includes('vaccin') || text.includes('veto') || text.includes('véto')) return 'sante';
  if (text.includes('stock') || text.includes('aliment') || text.includes('achat')) return 'stock';
  if (text.includes('fournisseur')) return 'fournisseurs';
  if (text.includes('invest')) return 'investissements';
  return isIn(row) ? 'autres_revenus' : 'autres_charges';
}

function buildFields(businessPlans = [], clients = [], fournisseurs = []) {
  const bpOptions = arr(businessPlans).map((bp) => ({ value: bp.id, label: bp.nom || bp.name || bp.id }));
  const clientOptions = arr(clients).map((client) => ({
    value: client.id,
    label: client.nom || client.raison_sociale || client.id,
  }));
  const supplierOptions = arr(fournisseurs).map((fournisseur) => ({
    value: fournisseur.id,
    label: fournisseur.nom || fournisseur.raison_sociale || fournisseur.id,
  }));
  return governFormFields('finances', MODULE_FORM_FIELDS.finances || []).map((field) => {
    if (field.key === 'business_plan_id' && bpOptions.length) {
      return { ...field, type: 'select', options: [{ value: '', label: '— Aucun —' }, ...bpOptions] };
    }
    if (field.key === 'client_id' && clientOptions.length) {
      return { ...field, type: 'select', options: [{ value: '', label: '— Aucun —' }, ...clientOptions] };
    }
    if (field.key === 'fournisseur_id' && supplierOptions.length) {
      return { ...field, type: 'select', options: [{ value: '', label: '— Aucun —' }, ...supplierOptions] };
    }
    return field;
  });
}

function isBlockedStockablePurchase(payload = {}) {
  if (isIn(payload)) return false;
  const probe = {
    ...payload,
    type: 'sortie',
    libelle: payload.libelle || payload.label || '',
    categorie: payload.categorie || payload.category || '',
    module_lie: payload.module_lie || '',
    source_module: payload.source_module || '',
  };
  return isStockableFinanceTransaction(probe);
}

export default function FinanceTransactionsOnly({
  rows = [],
  stocks = [],
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  businessPlans = [],
  clients = [],
  fournisseurs = [],
  onNavigate,
}) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const validRows = useMemo(() => arr(rows).filter((row) => hasAmount(row) && isManualExceptionFinanceTransaction(row)), [rows]);
  const financeFormFields = useMemo(
    () => buildFields(businessPlans, clients, fournisseurs),
    [businessPlans, clients, fournisseurs],
  );

  const guardOperationalCharge = (payload) => {
    const redirect = classifyOperationalChargeRedirect(payload);
    if (redirect?.block) {
      toast.error(redirect.message);
      onNavigate?.(redirect.module, redirect.tab ? { tab: redirect.tab } : undefined);
      return false;
    }
    if (!isBlockedStockablePurchase(payload)) return true;
    toast.error('Les achats stockables se saisissent dans Achats & Stock → Réception achat (pas en finance).');
    onNavigate?.('achats_stock', { tab: 'Stock' });
    return false;
  };

  const save = async (action, message, payload) => {
    if (payload && !guardOperationalCharge(payload)) return;
    try {
      setSaving(true);
      await action();
      await onRefresh?.();
      toast.success(message);
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Action impossible');
    } finally {
      setSaving(false);
    }
  };

  const repairStockEntry = (row) => {
    emitHorizonForm(
      'stock',
      'stock_purchase',
      'Créer entrée stock depuis cette dépense',
      buildStockReceptionFromFinanceTransaction(row, stocks),
    );
    onNavigate?.('achats_stock', { tab: 'Stock' });
  };

  const doExports = () => {
    exportToCsv({ rows: validRows, fileName: 'lignes-finance-manuelles.csv' });
    exportToExcel({ rows: validRows, fileName: 'lignes-finance-manuelles.xlsx', sheetName: 'Manuelles' });
    exportToPdf({ rows: validRows, title: 'Lignes finance manuelles — Horizon Farm', fileName: 'lignes-finance-manuelles.pdf' });
    toast.success('Export lignes manuelles généré (hub PDF officiel : Résumé / Financement)');
  };

  const columns = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'libelle', label: 'Libellé', sortable: true, render: (row) => <span className="font-semibold text-[#2f2415]">{row.libelle || row.label || '-'}</span> },
    { key: 'type', label: 'Type', sortable: true, render: (row) => <span className={`inline-flex items-center gap-1 font-semibold ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{isIn(row) ? 'argent reçu' : 'argent dépensé'}</span> },
    { key: 'categorie', label: 'Activité', sortable: true, render: (row) => activityLabels[detectActivity(row)] || '-' },
    { key: 'module_lie', label: 'Module lié', sortable: true, render: (row) => row.module_lie || row.source_module || '-' },
    { key: 'montant', label: 'Montant', sortable: true, render: (row) => <span className={`font-black ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? '+' : '-'}{fmtCurrency(amount(row))}</span> },
    { key: 'statut', label: 'Statut', sortable: true, render: (row) => <Badge status={row.statut || row.status || 'paye'} /> },
    { key: 'paiement', label: 'Paiement', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        const showRepair = !isIn(row) && isStockableFinanceTransaction(row) && !financeTransactionHasStockLink(row, stocks);
        return (
          <div className="flex flex-wrap gap-1">
            {showRepair ? (
              <ActionIconButton icon={Package} color="emerald" title="Créer entrée stock depuis cette dépense" onClick={() => repairStockEntry(row)} />
            ) : null}
            <ActionIconButton icon={Eye} color="sky" title="Voir" onClick={() => { setSelected(row); setModal('details'); }} />
            <ActionIconButton icon={Edit} color="amber" title="Modifier" onClick={() => { setSelected(row); setModal('edit'); }} />
            <ActionIconButton icon={Trash2} color="red" title="Supprimer" onClick={() => { setSelected(row); setModal('delete'); }} />
          </div>
        );
      },
    },
  ];

  return <div className="space-y-4">
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      Les <b>achats stockables</b> (intrants, aliments, matériel…) doivent être enregistrés via <b>Achats & Stock → Réception achat</b>. La finance est créée automatiquement. Ici : frais divers et ajustements manuels. Santé / stock / paie : modules source. Rapprochement pour l’historique.
    </div>
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <p className="font-black text-[#2f2415]">Lignes finance manuelles</p>
        <p className="text-sm text-[#8a7456]">Table des saisies manuelles uniquement. La synthèse des dépenses est au-dessus.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn icon={RefreshCw} variant="outline" small onClick={() => onRefresh?.()}>Actualiser</Btn>
        <Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter argent reçu/dépensé</Btn>
        <Btn icon={Download} variant="outline" small onClick={doExports}>Export lignes manuelles</Btn>
      </div>
    </div>
    <DataTable title="Lignes finance" rows={validRows} columns={columns} loading={loading} initialSortKey="date" searchPlaceholder="Rechercher libellé, catégorie, activité..." />
    <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected} title="Détail ligne finance" />
    <CreateModal
      open={modal === 'create'}
      onClose={() => setModal(null)}
      onSubmit={(payload) => save(
        async () => {
          const enriched = enrichFinanceTransaction(
            { ...payload, statut: payload.statut || 'paye' },
            { origin_type: ORIGIN_TYPES.MANUAL, source_module: 'finances', source_record_id: payload.id || '' },
          );
          if (financeTransactionWouldDuplicate(enriched, rows)) {
            throw new Error('Écriture finance déjà existante (id ou source métier). Vérifiez la trésorerie ou le module source.');
          }
          await onCreate?.(enriched);
        },
        'Ligne finance exceptionnelle ajoutée',
        payload,
      )}
      fields={financeFormFields}
      initialValues={{ id: generateSequentialId('finances', rows), type: 'entree', date: today(), statut: 'paye', paiement: 'Wave' }}
      autoId={() => generateSequentialId('finances', rows)}
      uploadFolder="finances"
      loading={saving}
      title="Ajouter argent reçu / dépensé"
      submitLabel="Ajouter"
    />
    <EditModal
      open={modal === 'edit'}
      onClose={() => setModal(null)}
      onSubmit={(payload) => selected && save(() => onUpdate?.(selected.id, payload), 'Ligne finance modifiée', payload)}
      fields={financeFormFields}
      initialValues={selected || {}}
      uploadFolder="finances"
      loading={saving}
      title="Modifier ligne finance"
      submitLabel="Enregistrer"
    />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={() => selected && save(() => onDelete?.(selected.id), 'Ligne finance supprimée')} itemLabel={selected ? `${selected.libelle || selected.id}` : ''} loading={saving} />
  </div>;
}
