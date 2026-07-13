import { CheckCircle2, Clock, PackageCheck, RotateCcw, Truck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtNumber, toNumber } from '../utils/format';

const STATUSES = [
  { value: 'ok', label: 'OK / disponible', icon: CheckCircle2 },
  { value: 'en_attente_fournisseur', label: 'En attente fournisseur', icon: Clock },
  { value: 'en_attente_livraison', label: 'En attente livraison', icon: Truck },
  { value: 'recu_a_controler', label: 'Reçu à contrôler', icon: PackageCheck },
  { value: 'non_conforme', label: 'Non conforme', icon: XCircle },
  { value: 'a_retourner', label: 'À retourner', icon: RotateCcw },
  { value: 'retourne', label: 'Retourné fournisseur', icon: RotateCcw },
  { value: 'bloque', label: 'Bloqué / quarantaine', icon: XCircle },
  { value: 'perime', label: 'Périmé', icon: XCircle },
  { value: 'reserve', label: 'Réservé', icon: PackageCheck },
  { value: 'epuise', label: 'Épuisé', icon: XCircle },
];

function statusOptions(row = {}) {
  const cat = String(row.categorie || row.type || '').toLowerCase();
  const base = ['ok', 'en_attente_fournisseur', 'en_attente_livraison', 'recu_a_controler', 'non_conforme', 'a_retourner', 'retourne', 'reserve', 'epuise'];
  if (cat.includes('vaccin') || cat.includes('medicament') || cat.includes('médicament')) return [...base, 'bloque', 'perime'];
  if (cat.includes('aliment')) return [...base, 'bloque', 'perime'];
  if (cat.includes('equip') || cat.includes('matériel') || cat.includes('materiel')) return [...base, 'bloque'];
  return base;
}

function statusLabel(value) {
  return STATUSES.find((s) => s.value === value)?.label || 'OK / disponible';
}

async function updateStatus(row, nextStatus, props) {
  try {
    await props.onUpdate?.(row.id, {
      statut: nextStatus,
      stock_status: nextStatus,
      status_updated_at: new Date().toISOString(),
    });
    await props.onCreateBusinessEvent?.({
      id: `EVT-${Date.now()}`,
      event_type: 'statut_stock',
      module_source: 'stock',
      entity_type: 'stock',
      entity_id: row.id,
      title: `Statut stock: ${statusLabel(nextStatus)}`,
      description: `${row.produit || row.id} -> ${statusLabel(nextStatus)}`,
      severity: ['non_conforme', 'a_retourner', 'bloque', 'perime', 'epuise'].includes(nextStatus) ? 'warning' : 'info',
      event_date: new Date().toISOString().slice(0, 10),
    });
    await props.onRefresh?.();
    toast.success('Statut stock mis à jour');
  } catch (error) {
    toast.error(error.message || 'Modification statut impossible');
  }
}

export default function StockStatusPanel(props) {
  const rows = Array.isArray(props.rows) ? props.rows : [];
  const suivis = rows.filter((row) => {
    const s = row.statut || row.stock_status || 'ok';
    return s !== 'ok' || toNumber(row.quantite) <= toNumber(row.seuil);
  }).slice(0, 8);
  const pending = rows.filter((r) => ['en_attente_fournisseur', 'en_attente_livraison', 'recu_a_controler'].includes(r.statut || r.stock_status)).length;
  const returns = rows.filter((r) => ['non_conforme', 'a_retourner', 'retourne', 'bloque'].includes(r.statut || r.stock_status)).length;
  const expired = rows.filter((r) => ['perime', 'epuise'].includes(r.statut || r.stock_status)).length;

  return (
    <div className="rounded-2xl border border-line bg-white p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate">Statuts stock</p>
          <h3 className="font-semibold text-earth">Disponibilité, livraison, contrôle et retour fournisseur</h3>
          <p className="text-sm text-slate mt-1">Chaque stock peut être suivi avec un statut métier modifiable selon sa catégorie.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Box label="En attente" value={pending} />
          <Box label="Retours/blocage" value={returns} />
          <Box label="Épuisé/périmé" value={expired} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {(suivis.length ? suivis : rows.slice(0, 6)).map((row) => {
          const current = row.statut || row.stock_status || 'ok';
          return (
            <div key={row.id} className="rounded-xl border border-line bg-card p-3">
              <p className="font-semibold text-earth">{row.produit || row.id}</p>
              <p className="text-xs text-slate mt-1">{row.categorie || 'stock'} · {fmtNumber(row.quantite)} {row.unite || ''} · statut: <b>{statusLabel(current)}</b></p>
              <select className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" value={current} onChange={(e) => updateStatus(row, e.target.value, props)}>
                {STATUSES.filter((s) => statusOptions(row).includes(s.value)).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Box({ label, value }) {
  return <div className="rounded-xl bg-card border border-line px-3 py-2 min-w-[100px]"><b className="block text-earth">{value}</b><span className="text-xs text-slate">{label}</span></div>;
}
