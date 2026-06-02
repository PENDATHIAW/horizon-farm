import { CheckCircle2, RefreshCw, ShoppingCart, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { deriveSalesOpportunities, isOpenSalesOpportunity, salesOpportunityAmount, salesOpportunityKey } from '../utils/salesOpportunityDerivation';
import { calculateSalesMargin, enrichWithSalesMargin } from '../utils/salesMarginEngine';

const arr = (value) => Array.isArray(value) ? value : [];
const effective = (provided, fallback) => arr(provided).length ? provided : fallback;
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const clean = (value) => String(value || '').trim();
function sourceKey(row = {}) { return `${clean(row.source_module || row.created_from || row.module_source)}:${clean(row.source_id || row.related_id || row.entity_id)}`; }
function orderLinkedToOpportunity(order = {}, opp = {}) { const oppId = clean(opp.id); const key = salesOpportunityKey(opp); const orderKey = `${clean(order.source_module || order.created_from || order.module_source)}:${clean(order.source_id || order.related_id || order.entity_id)}`; return clean(order.opportunity_id) === oppId || clean(order.source_opportunity_id) === oppId || clean(order.opportunity_key) === key || (key && orderKey === key) || (sourceKey(opp) && orderKey === sourceKey(opp)); }
function quantityOf(opp = {}) { return Math.max(1, toNumber(opp.quantity ?? opp.quantite ?? 1)); }
function unitPriceOf(opp = {}) { const qty = quantityOf(opp); const price = toNumber(opp.unit_price ?? opp.prix_unitaire ?? opp.prix_vente ?? 0); if (price > 0) return price; return Math.round(salesOpportunityAmount(opp) / Math.max(1, qty)); }
function labelOf(opp = {}) { return opp.title || opp.product_name || opp.nom || opp.name || opp.id || 'Opportunité'; }
function sourceLabel(opp = {}) { const source = clean(opp.source_module || opp.created_from || opp.module_source || 'vente'); if (source === 'animaux') return 'Animal'; if (source === 'avicole') return 'Avicole'; if (source === 'cultures') return 'Culture'; if (source === 'stock') return 'Stock'; return source; }
function marginNeedsSync(opp = {}, margin = {}) { if (opp.is_derived) return false; if (Math.abs(toNumber(opp.cout_revient) - toNumber(margin.cout_revient)) > 1) return true; if (Math.abs(toNumber(opp.marge_directe ?? opp.marge_montant ?? opp.marge) - toNumber(margin.marge_directe)) > 1) return true; if (clean(opp.cout_source) !== clean(margin.cout_source)) return true; return false; }

export default function SalesOpportunitiesBridge({
  opportunities = [], rows = [], clients = [], lots = [], animaux = [], cultures = [], stocks = [], alimentationLogs = [], productionLogs = [], vaccins = [], marketPrices = [], businessEvents = [],
  onCreate, onRefresh, onCreateOpportunity, onUpdateOpportunity, onRefreshOpportunities, onCreateBusinessEvent, onRefreshBusinessEvents,
}) {
  const lotsCrud = useCrudModule('avicole');
  const animauxCrud = useCrudModule('animaux');
  const culturesCrud = useCrudModule('cultures');
  const stockCrud = useCrudModule('stock');
  const alimentationCrud = useCrudModule('alimentation_logs');
  const productionCrud = useCrudModule('production_oeufs_logs');
  const vaccinsCrud = useCrudModule('sante');
  const eventsCrud = useCrudModule('business_events');
  const opportunitiesCrud = useCrudModule('sales_opportunities');

  const [savingId, setSavingId] = useState('');
  const [syncingMargins, setSyncingMargins] = useState(false);
  const effectiveOpportunities = effective(opportunities, opportunitiesCrud.rows);
  const marginContext = { lots: effective(lots, lotsCrud.rows), animaux: effective(animaux, animauxCrud.rows), cultures: effective(cultures, culturesCrud.rows), stocks: effective(stocks, stockCrud.rows), alimentationLogs: effective(alimentationLogs, alimentationCrud.rows), productionLogs: effective(productionLogs, productionCrud.rows), vaccins: effective(vaccins, vaccinsCrud.rows), businessEvents: effective(businessEvents, eventsCrud.rows) };
  const createOpportunity = onCreateOpportunity || opportunitiesCrud.create;
  const updateOpportunity = onUpdateOpportunity || opportunitiesCrud.update;
  const refreshOpportunities = onRefreshOpportunities || opportunitiesCrud.refresh;
  const createBusinessEvent = onCreateBusinessEvent || eventsCrud.create;
  const refreshBusinessEvents = onRefreshBusinessEvents || eventsCrud.refresh;

  const active = useMemo(() => deriveSalesOpportunities({ opportunities: effectiveOpportunities, lots: marginContext.lots, animaux: marginContext.animaux, cultures: marginContext.cultures, stocks: marginContext.stocks, alimentationLogs: marginContext.alimentationLogs, productionLogs: marginContext.productionLogs, vaccins: marginContext.vaccins, marketPrices }).filter(isOpenSalesOpportunity).map((opp) => ({ opp, order: arr(rows).find((order) => orderLinkedToOpportunity(order, opp)) })).slice(0, 12), [effectiveOpportunities, marginContext, marketPrices, rows]);
  const syncableMargins = active.map(({ opp }) => ({ opp, margin: calculateSalesMargin({ ...opp, montant_total: salesOpportunityAmount(opp) }, marginContext) })).filter(({ opp, margin }) => marginNeedsSync(opp, margin));

  const syncOpportunityMargins = async () => {
    if (!syncableMargins.length) return toast.success('Marges opportunités déjà à jour');
    try { setSyncingMargins(true); for (const { opp, margin } of syncableMargins) await updateOpportunity?.(opp.id, { cout_revient: margin.cout_revient, cout_direct: margin.cout_direct, cout_source: margin.cout_source, marge_directe: margin.marge_directe, marge_montant: margin.marge_montant, marge: margin.marge, taux_marge_directe: margin.taux_marge_directe, marge_taux: margin.marge_taux, marge_calculee_at: new Date().toISOString() }); await refreshOpportunities?.(); toast.success(`${syncableMargins.length} marge(s) opportunité synchronisée(s)`); } catch (error) { toast.error(error.message || 'Synchronisation des marges opportunités impossible'); } finally { setSyncingMargins(false); }
  };

  const persistDerivedOpportunity = async (opp) => { if (!opp.is_derived) return opp; const enriched = enrichWithSalesMargin(opp, marginContext); const payload = { ...enriched, id: makeId('OPP'), is_derived: false, created_at: now(), updated_at: now() }; await createOpportunity?.(payload); return payload; };

  const convertToOrder = async (inputOpp) => {
    if (!inputOpp?.id) return toast.error('Opportunité invalide');
    const existing = arr(rows).find((order) => orderLinkedToOpportunity(order, inputOpp));
    if (existing) return toast.success('Commande déjà créée pour cette opportunité');
    try {
      setSavingId(inputOpp.id);
      const opp = await persistDerivedOpportunity(inputOpp);
      const quantity = quantityOf(opp); const unitPrice = unitPriceOf(opp); const total = Math.max(0, salesOpportunityAmount(opp) || quantity * unitPrice); const sourceModule = clean(opp.source_module || opp.created_from || opp.module_source || 'opportunites'); const sourceId = clean(opp.source_id || opp.related_id || opp.entity_id || opp.id); const margin = calculateSalesMargin({ ...opp, quantity, unit_price: unitPrice, montant_total: total, source_module: sourceModule, source_id: sourceId }, marginContext); const orderId = makeId('CMD');
      await onCreate?.({ id: orderId, date: today(), client_id: clean(opp.client_id), opportunity_id: opp.id, source_opportunity_id: opp.id, opportunity_key: salesOpportunityKey(opp), source_module: sourceModule, source_type: clean(opp.source_type || sourceModule), source_id: sourceId, related_id: sourceId, product_name: opp.product_name || labelOf(opp), quantity, unit: opp.unit || opp.unite || 'unite', unit_price: unitPrice, montant_total: total, total, cout_revient: margin.cout_revient, cout_direct: margin.cout_direct, cout_source: margin.cout_source, marge_directe: margin.marge_directe, marge_montant: margin.marge_montant, marge: margin.marge, taux_marge_directe: margin.taux_marge_directe, marge_taux: margin.marge_taux, montant_paye: 0, reste_a_payer: total, statut_commande: 'enregistree', statut_paiement: 'non_paye', notes: opp.notes || `Commande créée depuis opportunité ${opp.id}`, created_from: 'sales_opportunity', created_at: now() });
      await updateOpportunity?.(opp.id, { status: 'convertie', statut: 'convertie', converted_order_id: orderId, converted_at: now(), cout_revient: margin.cout_revient, cout_direct: margin.cout_direct, marge_directe: margin.marge_directe, marge_montant: margin.marge_montant, marge_taux: margin.marge_taux, cout_source: margin.cout_source });
      await createBusinessEvent?.({ id: makeId('EVT'), event_type: 'opportunite_convertie_commande', module_source: 'ventes', entity_type: 'sales_opportunity', entity_id: opp.id, title: `Commande créée depuis ${labelOf(opp)}`, description: `${sourceLabel(opp)} · ${fmtCurrency(total)} · marge directe ${fmtCurrency(margin.marge_directe)}`, event_date: today(), severity: 'info', linked_order_id: orderId, saisies_evitees: 4 });
      await Promise.allSettled([onRefresh?.(), refreshOpportunities?.(), refreshBusinessEvents?.()]);
      toast.success('Commande créée depuis l’opportunité avec marge directe');
    } catch { toast.error('Conversion opportunité impossible'); } finally { setSavingId(''); }
  };

  if (!active.length) return null;
  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Opportunités de vente</p><h3 className="font-black text-[#2f2415]">Sources prêtes à vendre</h3><p className="text-sm text-[#8a7456] mt-1">Animaux, lots avicoles, cultures ou stocks confirmés peuvent devenir une commande sans ressaisie.</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" disabled={syncingMargins} onClick={syncOpportunityMargins} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415] disabled:opacity-60">{syncingMargins ? <RefreshCw size={14} className="inline animate-spin" /> : <RefreshCw size={14} className="inline" />} Recalculer marges</button><div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#7d6a4a]"><Tag size={14} className="inline" /> {active.length} opportunité(s)</div></div></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">{active.map(({ opp, order }) => { const total = salesOpportunityAmount(opp); const margin = calculateSalesMargin({ ...opp, montant_total: total }, marginContext); const client = arr(clients).find((c) => clean(c.id) === clean(opp.client_id)); return <div key={opp.id || salesOpportunityKey(opp)} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]"><ShoppingCart size={14} className="inline" /> {labelOf(opp)}</p><p className="text-xs text-[#8a7456] mt-1">{sourceLabel(opp)} · {fmtNumber(quantityOf(opp))} {opp.unit || opp.unite || ''}{opp.is_derived ? ' · détectée' : ''}</p><p className="text-xs text-[#8a7456] mt-1">Valeur estimée : <b>{fmtCurrency(total)}</b></p><p className="text-xs text-[#8a7456] mt-1">Prix unitaire : <b>{fmtCurrency(unitPriceOf(opp))}</b> · Marge directe : <b className={margin.cout_revient > 0 ? 'text-emerald-700' : 'text-amber-700'}>{fmtCurrency(margin.marge_directe)}</b> · {margin.marge_taux}%</p>{opp.pricing_alerts?.length ? <p className="text-[11px] text-amber-700 mt-1">{opp.pricing_alerts.join(' ')}</p> : null}<p className="text-[11px] text-[#8a7456] mt-1">Coût : {margin.cout_revient > 0 ? fmtCurrency(margin.cout_revient) : 'à compléter'} · {margin.cout_source}</p><p className="text-xs text-[#8a7456] mt-1">Client : {client?.nom || client?.name || opp.client_id || 'à renseigner'}</p>{order ? <p className="mt-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={14} className="inline" /> Commande {order.id}</p> : <button type="button" disabled={savingId === opp.id} className="mt-3 text-sm font-bold text-emerald-700 disabled:opacity-60" onClick={() => convertToOrder(opp)}>{savingId === opp.id ? <RefreshCw size={14} className="inline animate-spin" /> : <CheckCircle2 size={14} className="inline" />} Créer commande</button>}</div>; })}</div>{syncableMargins.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{syncableMargins.length} opportunité(s) ont une marge à synchroniser.</div> : null}</div>;
}
