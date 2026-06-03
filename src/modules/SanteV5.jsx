import { AlertTriangle, CheckCircle2, Package, Syringe } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { commitHealthWorkflow, prepareHealthWorkflow } from '../services/workflowService';
import SanteV6 from './SanteV6.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);

const isHealthStock = (stock = {}) =>
  `${stock.categorie || ''} ${stock.produit || ''}`
    .toLowerCase()
    .match(/vaccin|médicament|medicament|soin|vermifuge|antibiotique/);

const dueSoon = (healthItem = {}) => {
  if (!healthItem.prevue) return false;

  const days = (new Date(healthItem.prevue) - new Date()) / 86400000;

  return days >= 0 && days <= 7;
};

const late = (healthItem = {}) =>
  String(healthItem.statut || '').toLowerCase() === 'retard' ||
  (healthItem.prevue && !healthItem.effectuee && new Date(healthItem.prevue) < new Date());

const findStock = (stocks, id) =>
  arr(stocks).find((stock) => String(stock.id) === String(id));

async function markDone(healthItem, props) {
  try {
    const preview = prepareHealthWorkflow(healthItem, {
      transactions: props.transactions,
      tasks: props.taches || props.tasks,
      events: props.businessEvents,
    });

    await commitHealthWorkflow(preview, {
      onUpdateHealth: props.onUpdate,
      onCreateFinanceTransaction: props.onCreateFinanceTransaction,
      onCreateTask: props.onCreateTask,
      onCreateBusinessEvent: props.onCreateBusinessEvent,
      onUpdateStockMovement: async (movement) => {
        const stock = findStock(props.stocks, movement.stock_id);

        if (!stock || !props.onUpdateStock) return;

        const nextQty = Math.max(0, toNumber(stock.quantite) - toNumber(movement.qty));

        await props.onUpdateStock(stock.id, {
          quantite: nextQty,
          derniere_sortie: new Date().toISOString().slice(0, 10),
          source_module: 'sante',
          source_record_id: healthItem.id,
        });
      },
    });

    await Promise.allSettled([
      props.onRefreshWorkflow?.(),
      props.onRefresh?.(),
      props.onRefreshFinances?.(),
      props.onRefreshStock?.(),
      props.onRefreshTasks?.(),
      props.onRefreshBusinessEvents?.(),
    ]);

  } catch (error) {
    toast.error(error.message || 'Validation santé impossible');
  }
}

function Mini({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[100px]">
      <Icon size={14} className="text-[#9a6b12]" />

      <b className="block text-[#2f2415]">{value}</b>

      <span className="text-xs text-[#8a7456]">{label}</span>
    </div>
  );
}

function HealthBridge(props) {
  const vaccins = arr(props.rows);
  const stocks = arr(props.stocks);
  const healthStocks = stocks.filter(isHealthStock);
  const alerts = vaccins.filter((item) => late(item) || dueSoon(item)).slice(0, 6);
  const rupture = healthStocks.filter((stock) => toNumber(stock.quantite) <= toNumber(stock.seuil)).length;
  const costs = vaccins.reduce((sum, item) => sum + toNumber(item.cout), 0);

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">
            Priorité 5 · Santé connectée
          </p>

          <h3 className="font-black text-[#2f2415]">
            Soins, vaccins, stock santé, alertes et finances
          </h3>

          <p className="text-sm text-[#8a7456] mt-1">
            Un soin validé relie automatiquement la dépense Finance, la tâche de suivi,
            l’historique et la sortie de stock santé quand ces données existent.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <Mini icon={Syringe} label="À suivre" value={alerts.length} />
          <Mini icon={Package} label="Stock santé" value={healthStocks.length} />
          <Mini icon={AlertTriangle} label="Ruptures" value={rupture} />
        </div>
      </div>

      {alerts.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {alerts.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"
            >
              <p className="font-bold text-[#2f2415]">{item.nom || item.id}</p>

              <p className="text-xs text-[#8a7456] mt-1">
                Prévu: {item.prevue || '—'} · coût: {fmtCurrency(item.cout)}
              </p>

              <button
                type="button"
                className="mt-3 text-sm font-bold text-emerald-700"
                onClick={() => markDone(item, props)}
              >
                <CheckCircle2 size={14} className="inline" /> Valider l'action
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]">
          <CheckCircle2 size={14} className="inline" /> Aucun soin urgent.
        </div>
      )}

      {healthStocks.length ? (
        <p className="text-xs text-[#8a7456]">
          Stocks santé suivis:{' '}
          {healthStocks
            .slice(0, 5)
            .map((stock) => `${stock.produit} (${fmtNumber(stock.quantite)} ${stock.unite || ''})`)
            .join(' · ')}
        </p>
      ) : null}

      <p className="text-xs text-[#8a7456]">
        Coût santé total renseigné: {fmtCurrency(costs)}
      </p>
    </div>
  );
}

export default function SanteV5(props) {
  return (
    <div className="space-y-6">
      <HealthBridge {...props} />
      <SanteV6 {...props} />
    </div>
  );
}
