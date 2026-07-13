import ChartsGrid from '../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../components/charts/SmartPieChart.jsx';
import { monthKeyFromDate, monthLabelFromKey, resolveChartDate } from '../utils/chartDates';
import { toNumber } from '../utils/format';
import { paidForOrder, remainingForOrder } from '../utils/salesStatuses';
import { summarizeSalesMargins } from '../utils/salesMarginEngine';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? row.montant ?? 0);

const paymentOrderId = (row = {}) => String(row.order_id || row.sale_id || row.commande_id || row.related_id || row.source_record_id || '').trim();
const isCancelledPayment = (row = {}) => ['annule', 'annulé', 'annulee', 'cancelled', 'supprime', 'supprimé', 'deleted'].includes(lower(row.statut || row.status));
const hasMissingCost = (row = {}) => Boolean(row.cout_a_completer || row.margin_reliable === false || (amount(row) > 0 && toNumber(row.cout_revient ?? row.cout_direct) <= 0));
const reliableMargin = (row = {}) => hasMissingCost(row) ? 0 : toNumber(row.marge_directe ?? row.marge_montant ?? row.marge ?? 0);

function ensure(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabelFromKey(key), commandes: 0, encaisses: 0, impayes: 0, marge: 0, nb_commandes: 0, ouvertes: 0, converties: 0, taux_paiement: 0 }); return map.get(key); }
function activeLinkedPayments(rows = [], payments = []) { const orderIds = new Set(arr(rows).map((row) => String(row.id || '').trim()).filter(Boolean)); return arr(payments).filter((payment) => !isCancelledPayment(payment) && paymentOrderId(payment) && orderIds.has(paymentOrderId(payment))); }

function buildMarginContext(props = {}) {
  return {
    lots: props.lots || [],
    animaux: props.animaux || [],
    cultures: props.cultures || [],
    stocks: props.stocks || [],
    alimentationLogs: props.alimentationLogs || [],
    productionLogs: props.productionLogs || [],
    vaccins: props.vaccins || [],
    businessEvents: props.businessEvents || [],
    payments: props.payments || [],
    transactions: props.transactions || [],
  };
}

function buildMonthly({ rows = [], payments = [], opportunities = [], marginDetails = [] }) {
  const map = new Map();
  let undatedOrders = 0;
  const linkedPayments = activeLinkedPayments(rows, payments);
  const marginMap = new Map(arr(marginDetails).map((row) => [String(row.id), row]));
  arr(rows).forEach((order) => {
    const key = monthKeyFromDate(resolveChartDate(order));
    if (!key) {
      undatedOrders += 1;
      return;
    }
    const bucket = ensure(map, key);
    const enriched = marginMap.get(String(order.id)) || order;
    bucket.commandes += amount(enriched);
    bucket.encaisses += paidForOrder(order, linkedPayments);
    bucket.impayes += remainingForOrder(order, linkedPayments);
    bucket.marge += reliableMargin(enriched);
    bucket.nb_commandes += 1;
    if (remainingForOrder(order, linkedPayments) > 0) bucket.ouvertes += 1;
  });
  arr(opportunities).forEach((opp) => {
    const key = monthKeyFromDate(resolveChartDate(opp, [opp.created_at, opp.updated_at, opp.date]));
    if (!key) return;
    const bucket = ensure(map, key);
    if (['gagnee', 'gagnée', 'converted', 'convertie', 'commande'].includes(lower(opp.status || opp.statut))) bucket.converties += 1;
  });
  return {
    rows: [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => ({
      ...row,
      taux_paiement: row.commandes > 0 ? Number(((row.encaisses / row.commandes) * 100).toFixed(1)) : 0,
    })),
    undatedOrders,
  };
}

function labels(rows) { return rows.map((row) => row.mois); }
function values(rows, key) { return rows.map((row) => toNumber(row[key])); }

export default function SalesEvolution({
  rows = [],
  payments = [],
  opportunities = [],
  lots = [],
  animaux = [],
  cultures = [],
  stocks = [],
  alimentationLogs = [],
  productionLogs = [],
  vaccins = [],
  businessEvents = [],
  transactions = [],
}) {
  const linkedPayments = activeLinkedPayments(rows, payments);
  const marginContext = buildMarginContext({
    lots, animaux, cultures, stocks, alimentationLogs, productionLogs, vaccins, businessEvents, payments: linkedPayments, transactions,
  });
  const marginSummary = summarizeSalesMargins(rows, marginContext);
  const { rows: monthly, undatedOrders } = buildMonthly({ rows, payments: linkedPayments, opportunities, marginDetails: marginSummary.details });
  const totalOrders = arr(rows).reduce((sum, row) => sum + amount(row), 0);
  const totalPaid = arr(rows).reduce((sum, row) => sum + paidForOrder(row, linkedPayments), 0);
  const totalRemaining = arr(rows).reduce((sum, row) => sum + remainingForOrder(row, linkedPayments), 0);

  return (
    <ChartsGrid>
      {undatedOrders > 0 ? (
        <p className="col-span-full rounded-xl border border-vigilance bg-vigilance-bg px-4 py-2 text-sm text-horizon-dark">
          {undatedOrders} vente(s) sans date valide - exclue(s) des graphiques mensuels. Renseignez la date sur la fiche vente.
        </p>
      ) : null}
      <SmartEvolutionChart moduleName="Ventes" compact title="CA commandé vs encaissé" subtitle="Histogramme - montants mensuels" months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'CA commandé', type: 'bar', unit: 'FCFA', data: values(monthly, 'commandes') },
        { name: 'Encaissé', type: 'bar', unit: 'FCFA', data: values(monthly, 'encaisses') },
      ]} />
      <SmartEvolutionChart moduleName="Ventes" compact title="Impayés vs marge fiable" subtitle="Histogramme - reste à encaisser et marge" months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'Impayés', type: 'bar', unit: 'FCFA', data: values(monthly, 'impayes') },
        { name: 'Marge fiable', type: 'bar', unit: 'FCFA', data: values(monthly, 'marge') },
      ]} />
      <SmartEvolutionChart moduleName="Ventes" compact title="Taux de paiement" subtitle="Courbe - % encaissé sur CA" months={labels(monthly)} leftUnit="%" rightUnit="" series={[
        { name: 'Taux paiement', type: 'line', unit: '%', data: values(monthly, 'taux_paiement') },
      ]} />
      <SmartPieChart moduleName="Ventes" compact title="Répartition encaissements" subtitle="Camembert - payé vs reste à encaisser" unit="FCFA" items={[
        { name: 'Encaissé', value: totalPaid },
        { name: 'Impayés', value: totalRemaining },
      ]} />
      <SmartEvolutionChart moduleName="Ventes" compact title="Commandes ouvertes vs converties" subtitle="Histogramme - suivi pipeline" months={labels(monthly)} leftUnit="" rightUnit="" series={[
        { name: 'Commandes ouvertes', type: 'bar', data: values(monthly, 'ouvertes') },
        { name: 'Opport. converties', type: 'bar', data: values(monthly, 'converties') },
      ]} />
      <SmartPieChart moduleName="Ventes" compact title="Structure CA global" subtitle="Camembert - commandé / encaissé / impayés" unit="FCFA" items={[
        { name: 'Encaissé', value: totalPaid },
        { name: 'Impayés', value: totalRemaining },
        { name: 'CA non encaissé partiel', value: Math.max(0, totalOrders - totalPaid - totalRemaining) },
      ].filter((item) => item.value > 0)} />
    </ChartsGrid>
  );
}
