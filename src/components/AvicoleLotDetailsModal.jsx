import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import BaseModal from '../modals/BaseModal';
import Badge from './Badge';
import Btn from './Btn';
import FicheTabsBar from './FicheTabsBar.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { saleOpportunityKey } from '../utils/saleReadiness';
import { recommendAvicoleLotPrice } from '../services/salePricingEngine.js';
import { calculateLotMetrics } from '../utils/businessCalculations';
import { buildAvicoleLotDecision } from '../services/avicoleDecisionEngine';
import { computeAvicoleLivingTarget } from '../services/avicoleLivingTargets';
import { buildPondeuseProductionProfile, saleOpportunityGuard } from '../services/growthProjectionService';
import { PondeuseProductionPanel, SaleOpportunityGuardPanel, WeightProjectionPanel } from './GrowthProjectionPanel';
import { avicoleActiveCount, avicoleCalculatedActiveCount, avicoleDeadCount, avicoleHasCountMismatch, avicoleInitialCount, avicoleOtherExitCount, avicoleRegisteredActiveCount, avicoleSickCount, avicoleSoldCount } from '../utils/avicoleMetrics';

const Field = ({ label, value, children, danger = false }) => (
  <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-white'}`}>
    <p className="text-[11px] uppercase tracking-wide text-[#8a7456]">{label}</p>
    <div className={`mt-1 text-sm font-semibold break-words ${danger ? 'text-red-700' : 'text-[#2f2415]'}`}>{children || value || '-'}</div>
  </div>
);
const Section = ({ title, children, note }) => (
  <section className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4">
    <h3 className="text-sm font-black text-[#2f2415] mb-1">{title}</h3>
    {note ? <p className="mb-3 text-xs text-[#8a7456]">{note}</p> : null}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
  </section>
);
const EGGS_PER_TABLET = 30;
const today = () => new Date().toISOString().slice(0, 10);
const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim().toLowerCase();
const activeCount = avicoleActiveCount;
const deadCount = avicoleDeadCount;
const sickCount = avicoleSickCount;
const isPondeuse = (lot = {}) => clean(lot.type).includes('pondeuse');
const lotId = (lot = {}) => String(lot.id || '').trim();
const money = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? row.cout ?? row.coût ?? row.cost ?? row.cout_total ?? row.total_cost ?? 0);
const orderAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? row.ca ?? row.ca_total ?? 0);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0);
const purchaseCost = (lot = {}) => toNumber(lot.cout_total_achat ?? lot.cout_achat_bande ?? lot.purchase_cost ?? lot.cout_poussins ?? lot.cout_achat);
const tabletsFromEggs = (value = 0) => ({ tablettes: Math.floor(Math.max(0, toNumber(value)) / EGGS_PER_TABLET), oeufs_restants: Math.max(0, toNumber(value)) % EGGS_PER_TABLET });
const eggTabletLabel = (value = 0) => { const converted = tabletsFromEggs(value); return `${fmtNumber(value)} œufs · ${fmtNumber(converted.tablettes)} tablette(s) + ${fmtNumber(converted.oeufs_restants)} œuf(s)`; };
const estimatedSale = (lot = {}, active = 0, layer = false) => {
  const direct = toNumber(lot.prix_vente_estime ?? lot.estimated_sale_price ?? lot.valeur_vente_estimee ?? lot.sale_value_estimated);
  if (direct > 0) return direct;
  const unit = toNumber(lot.prix_unitaire_vente ?? lot.unit_sale_price ?? lot.prix_vente_sujet) || (layer ? 2500 : 3500);
  return active > 0 ? active * unit : 0;
};
function isCancelled(row = {}) { return ['annule', 'annulee', 'annulé', 'cancelled'].includes(clean(row.statut || row.status)); }
function matchLot(item = {}, lot = {}) {
  const id = lotId(lot);
  const values = [item.lot_id, item.source_id, item.source_record_id, item.related_id, item.cible_id, item.target_id, item.entity_id, item.product_id, item.article_id].map((v) => String(v || '').trim());
  if (values.some((value) => value && value === id)) return true;
  const text = clean(`${item.libelle || ''} ${item.title || ''} ${item.description || ''} ${item.notes || ''} ${item.product_name || ''} ${item.nom || ''}`);
  return Boolean(id && text.includes(clean(id)));
}
function isSaleLikeEvent(event = {}) {
  const text = clean(`${event.type_evenement || ''} ${event.event_type || ''} ${event.title || ''} ${event.description || ''} ${event.libelle || ''} ${event.category || ''} ${event.categorie || ''} ${event.nature || ''}`);
  if (/(charge|cout|coût|depense|dépense|frais|transport|traitement|soin|sante|santé|aliment|alimentation|perte|mort|maintenance|vaccin|main.?d.?oeuvre)/.test(text)) return false;
  return /(vente|vendu|sale|sold|paiement client|payment received|encaisse|encaiss|revenu|produit vendu|commande|client|chiffre d|ca\b|tablette vendue|oeufs vendus|œufs vendus|vente oeuf|vente œuf|vente poulet)/.test(text);
}
function isChargeLikeEvent(event = {}) {
  if (isSaleLikeEvent(event)) return false;
  const text = clean(`${event.type_evenement || ''} ${event.event_type || ''} ${event.title || ''} ${event.description || ''} ${event.libelle || ''} ${event.category || ''} ${event.categorie || ''} ${event.nature || ''}`);
  return /(charge|cout|coût|depense|dépense|frais|transport|traitement|soin|sante|santé|aliment|alimentation|perte|mort|maintenance|vaccin|main.?d.?oeuvre)/.test(text);
}
function isFinanceCharge(tx = {}) {
  const text = clean(`${tx.type || ''} ${tx.nature || ''} ${tx.category || ''} ${tx.categorie || ''} ${tx.libelle || ''} ${tx.title || ''} ${tx.description || ''} ${tx.notes || ''}`);
  if (/(vente|revenu|encaisse|encaissement|produit|client|paiement reçu|paiement recu|sale|income|revenue|credit|crédit)/.test(text)) return false;
  return /(sortie|charge|depense|dépense|frais|cout|coût|expense|out|debit|débit|maintenance|transport|soin|sante|santé|aliment|alimentation|vaccin|achat)/.test(text);
}
function linkedSales(lot = {}, salesOrders = [], payments = []) {
  const orders = arr(salesOrders).filter((order) => !isCancelled(order) && matchLot(order, lot));
  const orderIds = orders.map((order) => String(order.id || '')).filter(Boolean);
  const linkedPayments = arr(payments).filter((payment) => orderIds.includes(String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || '')) || matchLot(payment, lot));
  const total = orders.reduce((sum, order) => sum + orderAmount(order), 0);
  const paid = linkedPayments.reduce((sum, payment) => sum + paymentAmount(payment), 0);
  return { orders, total, paid, remaining: Math.max(0, total - paid) };
}
function linkedFinanceOut(lot = {}, transactions = []) {
  return arr(transactions).filter((tx) => matchLot(tx, lot) && isFinanceCharge(tx)).reduce((sum, tx) => sum + money(tx), 0);
}
function consolidatedLotFinance({ lot, metrics, layer, active, businessEvents = [], salesOrders = [], payments = [], transactions = [] }) {
  const sales = linkedSales(lot, salesOrders, payments);
  const estimated = estimatedSale(lot, active, layer);
  const events = arr(businessEvents).filter((event) => matchLot(event, lot));
  const saleEvents = events.filter((event) => isSaleLikeEvent(event) || (estimated > 0 && Math.abs(money(event) - estimated) < 1 && !isChargeLikeEvent(event)));
  const chargeEvents = events.filter((event) => !saleEvents.includes(event) && isChargeLikeEvent(event));
  const eventCharges = chargeEvents.reduce((sum, event) => sum + money(event), 0);
  const financeCharges = linkedFinanceOut(lot, transactions);
  const achat = purchaseCost(lot);
  const alimentation = toNumber(metrics.feedingCost || 0);
  const baseCalculated = Math.max(toNumber(metrics.totalCost || 0), achat + alimentation);
  const healthOrOther = Math.max(0, eventCharges + financeCharges);
  const totalCost = baseCalculated + healthOrOther;
  const eventSale = saleEvents.reduce((sum, event) => sum + money(event), 0);
  const revenue = sales.total || estimated || eventSale;
  const revenueSource = sales.total > 0 ? 'commande liée' : estimated > 0 ? 'estimation fiche' : eventSale > 0 ? 'événement vente' : 'non renseigné';
  const warnings = [];
  const closed = !active || ['vendu', 'vendu_partiellement', 'abattu', 'reforme', 'réformé', 'cloture', 'clôturé'].some((word) => clean(`${lot.status || ''} ${lot.statut || ''} ${lot.phase || ''}`).includes(word));
  if (closed && !sales.orders.length && revenue > 0) warnings.push('Lot sorti/vendu sans commande de vente liée.');
  if (sales.orders.length && sales.paid <= 0) warnings.push('Commande liée détectée mais aucun paiement rattaché.');
  if (saleEvents.length && !sales.orders.length) warnings.push('Événement de vente/valorisation détecté sans commande : vérifier le module Ventes.');
  if (!sales.orders.length && revenue <= 0) warnings.push('Aucune vente liée ou estimation de vente pour ce lot.');
  return { achat, alimentation, eventCharges, financeCharges, totalCost, revenue, revenueSource, paid: sales.paid, remaining: sales.orders.length ? sales.remaining : 0, ordersCount: sales.orders.length, margin: revenue - totalCost, warnings };
}
const existingOpportunityFor = (lot = {}, opportunities = []) => opportunities.find((opp) => String(opp.source_id || opp.entity_id || opp.related_id || '') === String(lot.id) && !['converti', 'converted', 'annule', 'annulé', 'ignore', 'ignoré', 'perdu', 'cloture', 'clôturé'].some((status) => clean(opp.status || opp.statut).includes(status)));
function livingAsProjection(living) {
  return { status: living.status, label: living.status?.replaceAll('_', ' ') || 'Suivi en cours', currentWeight: living.currentWeight || 0, targetWeight: living.livingTarget || living.defaultTargetWeight || 0, projectedWeight: living.projectedWeight || 0, targetDays: living.targetDays || 45, gainPerDay: living.adaptiveGainPerDay || living.realGainPerDay || 0, action: living.action, history: living.history || [] };
}

export default function AvicoleLotDetailsModal({ open, onClose, lot, productionLogs = [], alimentationLogs = [], opportunities = [], salesOrders = [], payments = [], transactions = [], businessEvents = [], onCreateOpportunity, onUpdateOpportunity, onRefreshOpportunities, onCreateBusinessEvent, onRefreshBusinessEvents, onNavigate }) {
  const [tab, setTab] = useState('situation');

  useEffect(() => {
    if (open) setTab('situation');
  }, [open, lot?.id]);

  if (!lot) return <BaseModal open={open} onClose={onClose} title="Fiche lot avicole"><p className="text-[#8a7456]">Aucun lot sélectionné.</p></BaseModal>;
  const layer = isPondeuse(lot);
  const decision = buildAvicoleLotDecision(lot, productionLogs);
  const metrics = calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs });
  const guard = saleOpportunityGuard(lot, 'lot_avicole', opportunities);
  const livingTarget = computeAvicoleLivingTarget(lot, productionLogs);
  const growthProjection = livingAsProjection(livingTarget);
  const ponteProfile = buildPondeuseProductionProfile(lot, productionLogs);
  const active = activeCount(lot);
  const existingOpportunity = existingOpportunityFor(lot, opportunities);
  const finance = consolidatedLotFinance({ lot, metrics, layer, active, businessEvents, salesOrders, payments, transactions });
  const reminderWeighingDate = decision.reminderWeighingDate || lot.rappel_pesee || lot.date_rappel_pesee || (livingTarget.nextWeighingDate ? '' : '');
  const expectedEggsDay = toNumber(livingTarget.expectedEggsDay || decision.expectedEggsDay || 0);
  const recentEggsDay = toNumber(livingTarget.recentDailyEggs || decision.avgEggsDay || 0);
  const gapEggsDay = toNumber(livingTarget.gapEggsDay || recentEggsDay - expectedEggsDay);

  const salePricing = recommendAvicoleLotPrice({ lot, alimentationLogs, productionLogs });

  const confirmOpportunity = async () => {
    if (!onCreateOpportunity && !onUpdateOpportunity) return toast.error('Création opportunité non disponible pour ce module');
    const title = layer ? `Réforme / vente pondeuses : ${lot.name || lot.id}` : `Poulets de chair prêts : ${lot.name || lot.id}`;
    const unitPrice = Number(lot.prix_vente_estime || lot.prix_unitaire_vente || salePricing.recommendedUnitPrice || 0) || 0;
    const payload = { opportunity_key: saleOpportunityKey('avicole', lot.id), source_module: 'avicole', source_type: layer ? 'lot_pondeuses' : 'lot_chair', source_id: lot.id, related_id: lot.id, title, product_name: `${lot.name || lot.id} · ${lot.type || 'Avicole'}`, quantity: active, unit: layer ? 'sujet reforme' : 'sujet', unit_price: unitPrice, estimated_amount: active * unitPrice, status: 'ouverte', statut: 'ouverte', priority: decision.priority || 'moyenne', notes: `${decision.decision || 'Opportunité confirmée'} · ${livingTarget.action}`, created_from: 'avicole_lot_details', updated_at: new Date().toISOString() };
    try {
      if (existingOpportunity?.id && onUpdateOpportunity) { await onUpdateOpportunity(existingOpportunity.id, payload); toast.success('Opportunité existante mise à jour'); }
      else if (!existingOpportunity?.id && onCreateOpportunity) { await onCreateOpportunity({ id: makeId('OPP'), ...payload, created_at: new Date().toISOString() }); toast.success('Opportunité de vente créée'); }
      else { toast.error('Opportunité existante détectée, mais modification indisponible'); return; }
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: existingOpportunity?.id ? 'opportunite_vente_mise_a_jour' : 'opportunite_vente_creee', module_source: 'avicole', entity_type: 'lot_avicole', entity_id: lot.id, source_id: lot.id, related_id: lot.id, title, description: payload.notes, event_date: today(), severity: 'info', saisies_evitees: 2 });
      await Promise.allSettled([onRefreshOpportunities?.(), onRefreshBusinessEvents?.()]);
    } catch (error) { toast.error(error.message || 'Création opportunité impossible'); }
  };

  return <BaseModal open={open} onClose={onClose} title={`Fiche ${layer ? 'pondeuses' : 'poulets de chair'} · ${lot.name || lot.id}`}>
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#d6c3a0] bg-[#2f2415] p-4 text-white"><p className="text-xs uppercase tracking-[0.2em] text-[#c9a96a]">{layer ? 'Lot pondeuses' : 'Lot poulets de chair'}</p><h2 className="mt-1 text-2xl font-black">{lot.name || lot.id}</h2><p className="mt-1 text-sm text-[#f4e6c8]">{lot.type || 'Type non renseigné'} · {active} sujet(s) actif(s)</p><div className="mt-3 flex flex-wrap gap-2"><Badge status={lot.status || 'actif'} /><Badge status={lot.health_status || 'sain'} /><span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs text-[#f4e6c8]">{livingTarget.status?.replaceAll('_', ' ') || decision.decision}</span></div></div>

      <FicheTabsBar
        tabs={[
          { id: 'situation', label: 'Situation' },
          { id: 'production', label: layer ? 'Ponte & objectifs' : 'Poids & croissance' },
          { id: 'decision', label: 'Décision IA' },
          { id: 'finances', label: 'Finances' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'situation' ? (
        <Section title="Situation du lot" note="Règle terrain : effectif actuel = initial - morts - vendus - pertes/sorties. Les malades restent présents et sont affichés à surveiller.">
          <Field label="Effectif initial" value={fmtNumber(avicoleInitialCount(lot))} />
          <Field label="Morts" value={fmtNumber(deadCount(lot))} />
          <Field label="Malades / à surveiller" value={fmtNumber(sickCount(lot))} />
          <Field label="Vendus / sortis" value={fmtNumber(avicoleSoldCount(lot) + avicoleOtherExitCount(lot))} />
          <Field label="Effectif actuel calculé" value={fmtNumber(active)} />
          <Field label="Effectif actuel enregistré" value={fmtNumber(avicoleRegisteredActiveCount(lot))} danger={avicoleHasCountMismatch(lot)}>{fmtNumber(avicoleRegisteredActiveCount(lot))}{avicoleHasCountMismatch(lot) ? <p className="mt-1 text-[11px] text-red-700">Incohérence : le calcul donne {fmtNumber(avicoleCalculatedActiveCount(lot))}.</p> : null}</Field>
          <Field label="Date entrée" value={lot.date_debut || lot.entry_date || '-'} />
          <Field label="Phase" value={lot.phase || '-'} />
        </Section>
      ) : null}

      {tab === 'production' ? (
        layer ? (
          <>
            <PondeuseProductionPanel profile={ponteProfile} />
            <Section title="Objectif ponte vivant" note="Objectif calculé selon âge du lot, effectif actif, historique des ramassages, casses et baisse éventuelle de ponte.">
              <Field label="Objectif initial" value={`${livingTarget.objectiveInitial || 0}%`} />
              <Field label="Objectif âge" value={`${livingTarget.ageExpectedPct || 0}%`} />
              <Field label="Objectif vivant" value={`${livingTarget.livingObjectivePct || 0}%`} />
              <Field label="Taux réel récent" value={`${livingTarget.realLayingPct || 0}%`} />
              <Field label="Œufs attendus / jour" value={eggTabletLabel(expectedEggsDay)} />
              <Field label="Œufs réels / jour" value={eggTabletLabel(recentEggsDay)} />
              <Field label="Écart / jour" value={`${gapEggsDay >= 0 ? '+' : ''}${eggTabletLabel(Math.abs(gapEggsDay))}`} />
              <Field label="Action IA" value={livingTarget.action} />
            </Section>
          </>
        ) : (
          <>
            <WeightProjectionPanel title="Objectif poids vivant & vente" projection={growthProjection} />
            <Section title="Objectif poids vivant chair" note="L'objectif se recalcule après chaque pesée selon le gain moyen réel du lot.">
              <Field label="Poids moyen actuel" value={livingTarget.currentWeight ? `${livingTarget.currentWeight} kg` : 'À renseigner via suivi'} />
              <Field label="Objectif initial" value={`${livingTarget.defaultTargetWeight || 0} kg`} />
              <Field label="Objectif vivant" value={`${livingTarget.livingTarget || 0} kg`} />
              <Field label="Projection J45" value={`${livingTarget.projectedWeight || 0} kg`} />
              <Field label="Gain réel / jour" value={`${livingTarget.realGainPerDay || 0} kg/j`} />
              <Field label="Prochaine pesée" value={livingTarget.nextWeighingDate || '-'} />
              <Field label="Rappel pesée J-1" value={reminderWeighingDate || '-'} />
              <Field label="Statut" value={livingTarget.status?.replaceAll('_', ' ') || '-'} />
              <Field label="Action IA" value={livingTarget.action} />
            </Section>
          </>
        )
      ) : null}

      {tab === 'decision' ? (
        <>
          <SaleOpportunityGuardPanel guard={guard} />
          <div className="flex flex-wrap gap-2 rounded-2xl border border-[#eadcc2] bg-white p-3"><Btn small onClick={confirmOpportunity}>{existingOpportunity ? 'Mettre à jour opportunité' : 'Confirmer opportunité de vente'}</Btn><Btn small variant="outline" onClick={() => onNavigate?.('ventes')}>Voir opportunités / ventes</Btn></div>
          <Section title="Décision IA" note="Décision affichée, à valider par l'utilisateur avant création d'opportunité."><Field label="Décision" value={decision.decision} /><Field label="Priorité" value={decision.priority || '-'} /><Field label="Prochaine action" value={decision.nextWeighingDate || decision.reformStart || livingTarget.nextWeighingDate || '-'} /><Field label="Poids / ponte attendu" value={decision.expectedWeight ? `${decision.expectedWeight} kg` : decision.expectedEggsDay ? eggTabletLabel(decision.expectedEggsDay) : livingTarget.expectedEggsDay ? eggTabletLabel(livingTarget.expectedEggsDay) : '-'} /></Section>
        </>
      ) : null}

      {tab === 'finances' ? (
        <Section title="Coûts, ventes et marge consolidés" note="Achat, alimentation, événements de charge, transactions Finance, commandes, paiements et marge du lot.">
          {finance.warnings.length ? <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {finance.warnings.join(' ')}</div> : null}
          <Field label="Coût achat bande" value={fmtCurrency(finance.achat)} />
          <Field label="Alimentation calculée" value={fmtCurrency(finance.alimentation)} />
          <Field label="Événements de charge" value={fmtCurrency(finance.eventCharges)} />
          <Field label="Transactions Finance liées" value={fmtCurrency(finance.financeCharges)} />
          <Field label="Coût total consolidé" value={fmtCurrency(finance.totalCost)} />
          <Field label={finance.ordersCount > 0 ? 'Vente liée' : 'Vente estimée'} value={fmtCurrency(finance.revenue)}>{fmtCurrency(finance.revenue)}<p className="mt-1 text-[11px] text-[#8a7456]">{finance.revenueSource}</p></Field>
          <Field label="Payé" value={fmtCurrency(finance.paid)} />
          <Field label="Reste à encaisser" value={fmtCurrency(finance.remaining)} danger={finance.remaining > 0} />
          <Field label="Commandes liées" value={fmtNumber(finance.ordersCount)} />
          <Field label="Marge lot" value={fmtCurrency(finance.margin)} danger={finance.margin < 0} />
        </Section>
      ) : null}
    </div>
  </BaseModal>;
}
