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
import SalePricingSummaryCard from './SalePricingSummaryCard.jsx';
import { buildAvicoleProposedSaleDisplay, PROPOSED_PRICE_MARGIN_LABEL, SALE_PRICE_HELP_AVICOLE } from '../utils/salePricePresentation.js';
import { calculateLotMetrics } from '../utils/businessCalculations';
import { buildAvicoleLotDecision } from '../services/avicoleDecisionEngine';
import { computeAvicoleLivingTarget } from '../services/avicoleLivingTargets';
import { buildPondeuseProductionProfile, saleOpportunityGuard } from '../services/growthProjectionService';
import { PondeuseProductionPanel, SaleOpportunityGuardPanel, WeightProjectionPanel } from './GrowthProjectionPanel';
import { avicoleActiveCount, avicoleCalculatedActiveCount, avicoleDeadCount, avicoleHasCountMismatch, avicoleInitialCount, avicoleOtherExitCount, avicoleRegisteredActiveCount, avicoleSickCount, avicoleSoldCount } from '../utils/avicoleMetrics';
import { t } from '../i18n/fr/index.js';

const Field = ({ label, value, children, danger = false }) => (
  <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-urgent bg-urgent-bg' : 'border-line bg-white'}`}>
    <p className="text-meta uppercase tracking-normal text-slate">{label}</p>
    <div className={`mt-1 text-sm font-semibold break-words ${danger ? 'text-urgent' : 'text-earth'}`}>{children || value || '-'}</div>
  </div>
);
const Section = ({ title, children, note }) => (
  <section className="rounded-2xl border border-line bg-card p-4">
    <h3 className="text-sm font-semibold text-earth mb-1">{title}</h3>
    {note ? <p className="mb-3 text-xs text-slate">{note}</p> : null}
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
const eggTabletLabel = (value = 0) => { const converted = tabletsFromEggs(value); return t('avicoleLot.oeufsTablettes', { oeufs: fmtNumber(value), tablettes: fmtNumber(converted.tablettes), restants: fmtNumber(converted.oeufs_restants) }); };
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
  const revenueSource = sales.total > 0 ? t('avicoleLot.sourceRevenu.commande') : estimated > 0 ? t('avicoleLot.sourceRevenu.estimation') : eventSale > 0 ? t('avicoleLot.sourceRevenu.evenement') : t('avicoleLot.sourceRevenu.aucune');
  const warnings = [];
  const closed = !active || ['vendu', 'vendu_partiellement', 'abattu', 'reforme', 'réformé', 'cloture', 'clôturé'].some((word) => clean(`${lot.status || ''} ${lot.statut || ''} ${lot.phase || ''}`).includes(word));
  if (closed && !sales.orders.length && revenue > 0) warnings.push(t('avicoleLot.avertissements.sortiSansCommande'));
  if (sales.orders.length && sales.paid <= 0) warnings.push(t('avicoleLot.avertissements.commandeSansPaiement'));
  if (saleEvents.length && !sales.orders.length) warnings.push(t('avicoleLot.avertissements.evenementSansCommande'));
  if (!sales.orders.length && revenue <= 0) warnings.push(t('avicoleLot.avertissements.aucuneVente'));
  return { achat, alimentation, eventCharges, financeCharges, totalCost, revenue, revenueSource, paid: sales.paid, remaining: sales.orders.length ? sales.remaining : 0, ordersCount: sales.orders.length, margin: revenue - totalCost, warnings };
}
const existingOpportunityFor = (lot = {}, opportunities = []) => opportunities.find((opp) => String(opp.source_id || opp.entity_id || opp.related_id || '') === String(lot.id) && !['converti', 'converted', 'annule', 'annulé', 'ignore', 'ignoré', 'perdu', 'cloture', 'clôturé'].some((status) => clean(opp.status || opp.statut).includes(status)));
function livingAsProjection(living) {
  return { status: living.status, label: living.status?.replaceAll('_', ' ') || t('avicoleLot.suivi.enCours'), currentWeight: living.currentWeight || 0, targetWeight: living.livingTarget || living.defaultTargetWeight || 0, projectedWeight: living.projectedWeight || 0, targetDays: living.targetDays || 45, gainPerDay: living.adaptiveGainPerDay || living.realGainPerDay || 0, action: living.action, history: living.history || [] };
}

export default function AvicoleLotDetailsModal({ open, onClose, lot, productionLogs = [], alimentationLogs = [], opportunities = [], salesOrders = [], payments = [], transactions = [], businessEvents = [], onCreateOpportunity, onUpdateOpportunity, onRefreshOpportunities, onCreateBusinessEvent, onRefreshBusinessEvents, onNavigate, marketPrices = [] }) {
  const [tab, setTab] = useState('situation');

  useEffect(() => {
    if (open) queueMicrotask(() => setTab('situation'));
  }, [open, lot?.id]);

  if (!lot) return <BaseModal open={open} onClose={onClose} title={t('avicoleLot.titreGenerique')}><p className="text-slate">{t('avicoleLot.aucunLot')}</p></BaseModal>;
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

  const salePricing = recommendAvicoleLotPrice({ lot, alimentationLogs, productionLogs, marketPrices });
  const proposed = buildAvicoleProposedSaleDisplay(salePricing, lot);

  const confirmOpportunity = async () => {
    if (!onCreateOpportunity && !onUpdateOpportunity) return toast.error(t('avicoleLot.opportunite.indisponible'));
    const title = layer ? t('avicoleLot.opportunite.titrePondeuses', { nom: lot.name || lot.id }) : t('avicoleLot.opportunite.titreChair', { nom: lot.name || lot.id });
    const unitPrice = Number(lot.prix_vente_estime || lot.prix_unitaire_vente || salePricing.recommendedUnitPrice || 0) || 0;
    const payload = { opportunity_key: saleOpportunityKey('avicole', lot.id), source_module: 'avicole', source_type: layer ? 'lot_pondeuses' : 'lot_chair', source_id: lot.id, related_id: lot.id, title, product_name: `${lot.name || lot.id} · ${lot.type || t('avicoleLot.opportunite.especeParDefaut')}`, quantity: active, unit: layer ? 'sujet reforme' : 'sujet', unit_price: unitPrice, estimated_amount: active * unitPrice, status: 'ouverte', statut: 'ouverte', priority: decision.priority || 'moyenne', notes: `${decision.decision || t('avicoleLot.opportunite.noteConfirmee')} · ${livingTarget.action}`, created_from: 'avicole_lot_details', updated_at: new Date().toISOString() };
    try {
      if (existingOpportunity?.id && onUpdateOpportunity) { await onUpdateOpportunity(existingOpportunity.id, payload); toast.success(t('avicoleLot.opportunite.majReussie')); }
      else if (!existingOpportunity?.id && onCreateOpportunity) { await onCreateOpportunity({ id: makeId('OPP'), ...payload, created_at: new Date().toISOString() }); toast.success(t('avicoleLot.opportunite.creeeReussie')); }
      else { toast.error(t('avicoleLot.opportunite.majIndisponible')); return; }
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: existingOpportunity?.id ? 'opportunite_vente_mise_a_jour' : 'opportunite_vente_creee', module_source: 'avicole', entity_type: 'lot_avicole', entity_id: lot.id, source_id: lot.id, related_id: lot.id, title, description: payload.notes, event_date: today(), severity: 'info', saisies_evitees: 2 });
      await Promise.allSettled([onRefreshOpportunities?.(), onRefreshBusinessEvents?.()]);
    } catch (error) { toast.error(error.message || t('avicoleLot.opportunite.creationImpossible')); }
  };

  return <BaseModal open={open} onClose={onClose} title={t('avicoleLot.titreFiche', { espece: layer ? t('avicoleLot.especePondeuses') : t('avicoleLot.especeChair'), nom: lot.name || lot.id })}>
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-earth p-4 text-white"><p className="text-xs uppercase tracking-normal text-horizon">{layer ? t('avicoleLot.entete.lotPondeuses') : t('avicoleLot.entete.lotChair')}</p><h2 className="mt-1 text-2xl font-semibold">{lot.name || lot.id}</h2><p className="mt-1 text-sm text-line">{lot.type || t('avicoleLot.entete.typeNonRenseigne')} · {t('avicoleLot.entete.sujetsActifs', { n: active })}</p><div className="mt-3 flex flex-wrap gap-2"><Badge status={lot.status || 'actif'} /><Badge status={lot.health_status || 'sain'} /><span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs text-line">{livingTarget.status?.replaceAll('_', ' ') || decision.decision}</span></div></div>

      <SalePricingSummaryCard
        variant="avicole_lot"
        salePricing={salePricing}
        pricingBasis={proposed.pricingBasis}
        marginOnProposed={proposed.marginOnProposed}
        marginSource={proposed.marginSource}
        onOpenFinances={() => setTab('finances')}
      />

      <FicheTabsBar
        tabs={[
          { id: 'situation', label: t('avicoleLot.onglets.situation') },
          { id: 'production', label: layer ? t('avicoleLot.onglets.ponteObjectifs') : t('avicoleLot.onglets.poidsCroissance') },
          { id: 'decision', label: t('avicoleLot.onglets.decision') },
          { id: 'finances', label: t('avicoleLot.onglets.finances') },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'situation' ? (
        <Section title={t('avicoleLot.situation.titre')} note={t('avicoleLot.situation.note')}>
          <Field label={t('avicoleLot.situation.effectifInitial')} value={fmtNumber(avicoleInitialCount(lot))} />
          <Field label={t('avicoleLot.situation.morts')} value={fmtNumber(deadCount(lot))} />
          <Field label={t('avicoleLot.situation.malades')} value={fmtNumber(sickCount(lot))} />
          <Field label={t('avicoleLot.situation.vendusSortis')} value={fmtNumber(avicoleSoldCount(lot) + avicoleOtherExitCount(lot))} />
          <Field label={t('avicoleLot.situation.effectifCalcule')} value={fmtNumber(active)} />
          <Field label={t('avicoleLot.situation.effectifEnregistre')} value={fmtNumber(avicoleRegisteredActiveCount(lot))} danger={avicoleHasCountMismatch(lot)}>{fmtNumber(avicoleRegisteredActiveCount(lot))}{avicoleHasCountMismatch(lot) ? <p className="mt-1 text-meta text-urgent">{t('avicoleLot.situation.incoherence', { n: fmtNumber(avicoleCalculatedActiveCount(lot)) })}</p> : null}</Field>
          <Field label={t('avicoleLot.situation.dateEntree')} value={lot.date_debut || lot.entry_date || '-'} />
          <Field label={t('avicoleLot.situation.phase')} value={lot.phase || '-'} />
        </Section>
      ) : null}

      {tab === 'production' ? (
        layer ? (
          <>
            <PondeuseProductionPanel profile={ponteProfile} />
            <Section title={t('avicoleLot.ponte.titre')} note={t('avicoleLot.ponte.note')}>
              <Field label={t('avicoleLot.ponte.objectifInitial')} value={`${livingTarget.objectiveInitial || 0}%`} />
              <Field label={t('avicoleLot.ponte.objectifAge')} value={`${livingTarget.ageExpectedPct || 0}%`} />
              <Field label={t('avicoleLot.ponte.objectifVivant')} value={`${livingTarget.livingObjectivePct || 0}%`} />
              <Field label={t('avicoleLot.ponte.tauxReel')} value={`${livingTarget.realLayingPct || 0}%`} />
              <Field label={t('avicoleLot.ponte.oeufsAttendus')} value={eggTabletLabel(expectedEggsDay)} />
              <Field label={t('avicoleLot.ponte.oeufsReels')} value={eggTabletLabel(recentEggsDay)} />
              <Field label={t('avicoleLot.ponte.ecartJour')} value={`${gapEggsDay >= 0 ? '+' : ''}${eggTabletLabel(Math.abs(gapEggsDay))}`} />
              <Field label={t('avicoleLot.ponte.action')} value={livingTarget.action} />
            </Section>
          </>
        ) : (
          <>
            <WeightProjectionPanel title={t('avicoleLot.poids.titrePanneau')} projection={growthProjection} />
            <Section title={t('avicoleLot.poids.titre')} note={t('avicoleLot.poids.note')}>
              <Field label={t('avicoleLot.poids.poidsActuel')} value={livingTarget.currentWeight ? `${livingTarget.currentWeight} kg` : t('avicoleLot.poids.aRenseigner')} />
              <Field label={t('avicoleLot.poids.objectifInitial')} value={`${livingTarget.defaultTargetWeight || 0} kg`} />
              <Field label={t('avicoleLot.poids.objectifVivant')} value={`${livingTarget.livingTarget || 0} kg`} />
              <Field label={t('avicoleLot.poids.projectionJ45')} value={`${livingTarget.projectedWeight || 0} kg`} />
              <Field label={t('avicoleLot.poids.gainReel')} value={`${livingTarget.realGainPerDay || 0} kg/j`} />
              <Field label={t('avicoleLot.poids.prochainePesee')} value={livingTarget.nextWeighingDate || '-'} />
              <Field label={t('avicoleLot.poids.rappelPesee')} value={reminderWeighingDate || '-'} />
              <Field label={t('avicoleLot.poids.statut')} value={livingTarget.status?.replaceAll('_', ' ') || '-'} />
              <Field label={t('avicoleLot.poids.action')} value={livingTarget.action} />
            </Section>
          </>
        )
      ) : null}

      {tab === 'decision' ? (
        <>
          <SaleOpportunityGuardPanel guard={guard} />
          <div className="flex flex-wrap gap-2 rounded-2xl border border-line bg-white p-3"><Btn small onClick={confirmOpportunity}>{existingOpportunity ? t('avicoleLot.decision.majOpportunite') : t('avicoleLot.decision.confirmerOpportunite')}</Btn><Btn small variant="outline" onClick={() => onNavigate?.('ventes')}>{t('avicoleLot.decision.voirVentes')}</Btn></div>
          <Section title={t('avicoleLot.decision.titre')} note={t('avicoleLot.decision.note')}><Field label={t('avicoleLot.decision.decision')} value={decision.decision} /><Field label={t('avicoleLot.decision.priorite')} value={decision.priority || '-'} /><Field label={t('avicoleLot.decision.prochaineAction')} value={decision.nextWeighingDate || decision.reformStart || livingTarget.nextWeighingDate || '-'} /><Field label={t('avicoleLot.decision.poidsPonteAttendu')} value={decision.expectedWeight ? `${decision.expectedWeight} kg` : decision.expectedEggsDay ? eggTabletLabel(decision.expectedEggsDay) : livingTarget.expectedEggsDay ? eggTabletLabel(livingTarget.expectedEggsDay) : '-'} /></Section>
        </>
      ) : null}

      {tab === 'finances' ? (
        <Section title={t('avicoleLot.finances.titre')} note={SALE_PRICE_HELP_AVICOLE}>
          {finance.warnings.length ? <div className="md:col-span-2 rounded-xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark"><AlertTriangle size={15} className="inline" /> {finance.warnings.join(' ')}</div> : null}
          <Field label={t('avicoleLot.finances.coutAchat')} value={fmtCurrency(finance.achat)} />
          <Field label={t('avicoleLot.finances.alimentation')} value={fmtCurrency(finance.alimentation)} />
          <Field label={t('avicoleLot.finances.evenementsCharge')} value={fmtCurrency(finance.eventCharges)} />
          <Field label={t('avicoleLot.finances.transactionsFinance')} value={fmtCurrency(finance.financeCharges)} />
          <Field label={t('avicoleLot.finances.coutTotal')} value={fmtCurrency(finance.totalCost)} />
          <Field label={finance.ordersCount > 0 ? t('avicoleLot.finances.venteLiee') : t('avicoleLot.finances.venteEstimee')} value={fmtCurrency(finance.revenue)}>{fmtCurrency(finance.revenue)}<p className="mt-1 text-meta text-slate">{finance.revenueSource}</p></Field>
          <Field label={t('avicoleLot.finances.paye')} value={fmtCurrency(finance.paid)} />
          <Field label={t('avicoleLot.finances.resteEncaisser')} value={fmtCurrency(finance.remaining)} danger={finance.remaining > 0} />
          <Field label={t('avicoleLot.finances.commandesLiees')} value={fmtNumber(finance.ordersCount)} />
          <Field label={t('avicoleLot.finances.prixProposeTotal')} value={fmtCurrency(proposed.proposedTotal)} />
          <Field label={t('avicoleLot.finances.prixProposeSujet')} value={fmtCurrency(proposed.proposedUnit)} />
          <Field label={t('avicoleLot.finances.baseCalcul')} value={proposed.pricingBasis || '-'} />
          <Field label={t('avicoleLot.finances.plancherUnitaire')} value={fmtCurrency(proposed.minimumUnit || salePricing.minimumUnitPrice)} />
          <Field label={t('avicoleLot.finances.prixMarche')} value={salePricing.marketPrice ? fmtCurrency(salePricing.marketPrice) : t('avicoleLot.finances.marchePasRenseigne')} />
          <Field label={PROPOSED_PRICE_MARGIN_LABEL} value={proposed.marginOnProposed != null ? fmtCurrency(proposed.marginOnProposed) : '-'} />
          <Field label={t('avicoleLot.finances.margeConsolidee')} value={fmtCurrency(finance.margin)} danger={finance.margin < 0} />
          {salePricing.alerts?.length ? <div className="md:col-span-2 rounded-xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark">{salePricing.alerts.join(' ')}</div> : null}
        </Section>
      ) : null}
    </div>
  </BaseModal>;
}
