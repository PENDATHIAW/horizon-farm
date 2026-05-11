import { useMemo, useState } from 'react';
import { Calculator, CheckCircle2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { summarizeSalesMargins } from '../utils/salesMarginEngine';

const arr = (value) => Array.isArray(value) ? value : [];
const effective = (provided, fallback) => arr(provided).length ? provided : fallback;
const totalOf = (row = {}) => toNumber(row.chiffre_affaires ?? row.montant_total ?? row.total ?? row.total_amount ?? 0);
const paidOf = (row = {}) => toNumber(row.montant_encaisse ?? row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? 0);
const marginOf = (row = {}) => toNumber(row.marge_directe ?? row.marge_montant ?? row.marge ?? 0);
const cashMarginOf = (row = {}) => toNumber(row.marge_cash ?? paidOf(row) - costOf(row));
const costOf = (row = {}) => toNumber(row.cout_revient ?? row.cout_direct ?? 0);
const clean = (value) => String(value || '').trim();

function Mini({ label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-3 ${danger ? 'border-red-200 bg-red-50' : 'border-[#d6c3a0] bg-[#fffdf8]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="mt-1 text-[11px] text-[#8a7456]">{hint}</p> : null}</div>;
}

function needsUpdate(current = {}, enriched = {}) {
  if (!totalOf(current)) return false;
  if (!costOf(current) && costOf(enriched)) return true;
  if (Math.abs(marginOf(current) - marginOf(enriched)) > 1) return true;
  if (Math.abs(cashMarginOf(current) - cashMarginOf(enriched)) > 1 && paidOf(enriched) > 0) return true;
  if (clean(current.cout_source) !== clean(enriched.cout_source)) return true;
  return false;
}

export default function SalesMarginsBridge({
  rows = [], payments = [],
  lots = [],
  animaux = [],
  cultures = [],
  stocks = [],
  alimentationLogs = [],
  productionLogs = [],
  vaccins = [],
  businessEvents = [],
  onUpdate,
  onRefresh,
}) {
  const lotsCrud = useCrudModule('avicole');
  const animauxCrud = useCrudModule('animaux');
  const culturesCrud = useCrudModule('cultures');
  const stockCrud = useCrudModule('stock');
  const alimentationCrud = useCrudModule('alimentation_logs');
  const productionCrud = useCrudModule('production_oeufs_logs');
  const vaccinsCrud = useCrudModule('sante');
  const eventsCrud = useCrudModule('business_events');
  const paymentsCrud = useCrudModule('payments');

  const [syncing, setSyncing] = useState(false);
  const context = {
    lots: effective(lots, lotsCrud.rows),
    animaux: effective(animaux, animauxCrud.rows),
    cultures: effective(cultures, culturesCrud.rows),
    stocks: effective(stocks, stockCrud.rows),
    alimentationLogs: effective(alimentationLogs, alimentationCrud.rows),
    productionLogs: effective(productionLogs, productionCrud.rows),
    vaccins: effective(vaccins, vaccinsCrud.rows),
    businessEvents: effective(businessEvents, eventsCrud.rows),
    payments: effective(payments, paymentsCrud.rows),
  };
  const summary = useMemo(() => summarizeSalesMargins(rows, context), [rows, context.lots, context.animaux, context.cultures, context.stocks, context.alimentationLogs, context.productionLogs, context.vaccins, context.businessEvents, context.payments]);
  const enrichedRows = summary.details;
  const missingCost = enrichedRows.filter((row) => totalOf(row) > 0 && costOf(row) <= 0).length;
  const negativeMargins = enrichedRows.filter((row) => marginOf(row) < 0).length;
  const negativeCashMargins = enrichedRows.filter((row) => paidOf(row) > 0 && cashMarginOf(row) < 0).length;
  const toSync = enrichedRows.filter((enriched) => needsUpdate(arr(rows).find((row) => row.id === enriched.id), enriched));

  const syncMargins = async () => {
    if (!toSync.length) return toast.success('Marges déjà à jour');
    try {
      setSyncing(true);
      for (const row of toSync) {
        await onUpdate?.(row.id, { chiffre_affaires: row.chiffre_affaires, montant_encaisse: row.montant_encaisse, cout_revient: row.cout_revient, cout_direct: row.cout_direct, cout_source: row.cout_source, marge_directe: row.marge_directe, marge_montant: row.marge_montant, marge: row.marge, marge_cash: row.marge_cash, taux_marge_directe: row.taux_marge_directe, marge_taux: row.marge_taux, taux_marge_cash: row.taux_marge_cash, marge_calculee_at: row.marge_calculee_at });
      }
      await onRefresh?.();
      toast.success(`${toSync.length} marge(s) recalculée(s)`);
    } catch (error) {
      toast.error(error.message || 'Recalcul des marges impossible');
    } finally {
      setSyncing(false);
    }
  };

  if (!arr(rows).length) return null;

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Calculator size={20} /> Marges directes des commandes</p><p className="mt-1 text-sm text-[#8a7456]">Marge vente = vente - coût. Marge cash = encaissements réels - coût.</p></div><button type="button" disabled={syncing} onClick={syncMargins} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{syncing ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Recalculer les marges</button></div>
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><Mini label="Ventes" value={fmtCurrency(summary.ca)} hint={`${fmtNumber(enrichedRows.length)} commande(s)`} /><Mini label="Encaissé" value={fmtCurrency(summary.encaisse)} hint="paiements liés" /><Mini label="Coût direct" value={fmtCurrency(summary.directCost)} hint="coût de revient" danger={missingCost > 0} /><Mini label="Marge vente" value={fmtCurrency(summary.margin)} hint={`${summary.marginRate}%`} danger={summary.margin < 0} /><Mini label="Marge cash" value={fmtCurrency(summary.cashMargin)} hint={`${summary.cashMarginRate}%`} danger={summary.cashMargin < 0} /><Mini label="À compléter" value={fmtNumber(missingCost)} hint="coût indisponible" danger={missingCost > 0} /></div>
    <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-[#eadcc2] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 pr-4">Commande</th><th className="py-2 pr-4">Produit</th><th className="py-2 pr-4">Vente</th><th className="py-2 pr-4">Encaissé</th><th className="py-2 pr-4">Coût</th><th className="py-2 pr-4">Marge vente</th><th className="py-2 pr-4">Marge cash</th><th className="py-2 pr-4">Source coût</th></tr></thead><tbody>{enrichedRows.slice(0, 8).map((row) => <tr key={row.id} className="border-b border-[#f0e5d0]"><td className="py-3 pr-4 font-bold text-[#2f2415]">{row.id}</td><td className="py-3 pr-4">{row.product_name || row.produit || row.libelle || '—'}</td><td className="py-3 pr-4">{fmtCurrency(totalOf(row))}</td><td className="py-3 pr-4">{fmtCurrency(paidOf(row))}</td><td className="py-3 pr-4">{costOf(row) > 0 ? fmtCurrency(costOf(row)) : <span className="font-bold text-amber-700">à compléter</span>}</td><td className={`py-3 pr-4 font-bold ${marginOf(row) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{marginOf(row) < 0 ? <TrendingDown size={13} className="inline" /> : <TrendingUp size={13} className="inline" />} {fmtCurrency(marginOf(row))}</td><td className={`py-3 pr-4 font-bold ${cashMarginOf(row) < 0 && paidOf(row) > 0 ? 'text-red-600' : 'text-[#2f2415]'}`}>{fmtCurrency(cashMarginOf(row))}</td><td className="py-3 pr-4 text-[#8a7456]">{row.cout_source || '—'}</td></tr>)}</tbody></table></div>
    {toSync.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{toSync.length} commande(s) ont une marge à synchroniser avec le nouveau moteur.</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Les marges calculées sont alignées avec les commandes visibles.</div>}
    {negativeMargins || negativeCashMargins ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{negativeMargins} marge(s) vente négative(s), {negativeCashMargins} marge(s) cash négative(s). Vérifier prix, coûts et encaissements.</div> : null}
  </section>;
}
