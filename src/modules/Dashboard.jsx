import {
  CloudRain,
  Droplets,
  Heart,
  Moon,
  Package,
  RefreshCw,
  Sun,
  Syringe,
  Thermometer,
  Users,
  Wind,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { MiniBarChart, MiniDonut, MiniLineChart } from '../components/MiniCharts';
import SectionHeader from '../components/SectionHeader';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { consolidateFinance } from '../utils/financeConsolidationEngine';
import { calculateCultureMetrics, calculateLotMetrics, calculateStockMetrics } from '../utils/businessCalculations';
import { deriveSalesOpportunities } from '../utils/salesOpportunityDerivation';
import DashboardOperationsBridge from './DashboardOperationsBridge.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();

const closedStatuses = [
  'termine',
  'terminé',
  'annule',
  'annulé',
  'done',
  'traitee',
  'traitée',
  'resolue',
  'résolue',
  'fermee',
  'fermée',
  'convertie',
];

const isOpenTask = (task = {}) => !closedStatuses.includes(lower(task.status || task.statut || 'a_faire'));
const isOpenAlert = (alert = {}) => !closedStatuses.includes(lower(alert.status || alert.statut || 'nouvelle'));

const monthLabel = (key) => {
  const [, month] = String(key || '').split('-');

  return [
    'Jan',
    'Fév',
    'Mar',
    'Avr',
    'Mai',
    'Juin',
    'Juil',
    'Août',
    'Sep',
    'Oct',
    'Nov',
    'Déc',
  ][Number(month || 1) - 1] || key;
};

const monthKeyOf = (date) => String(date || new Date().toISOString()).slice(0, 7);

const lastMonths = (count = 6) => {
  const base = new Date();

  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(base.getFullYear(), base.getMonth() - (count - 1 - index), 1);
    return date.toISOString().slice(0, 7);
  });
};

const orderTotal = (order = {}) => toNumber(order.montant_total ?? order.total ?? order.amount);
const paymentAmount = (payment = {}) => toNumber(payment.montant_paye ?? payment.montant ?? payment.amount ?? payment.paid_amount);
const paymentOrderId = (payment = {}) => payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id;

function buildMonthlyActivity({ salesOrders = [], payments = [] }) {
  return lastMonths(6).map((key) => {
    const orders = arr(salesOrders).filter((order) => monthKeyOf(order.date || order.created_at) === key);
    const ca = orders.reduce((sum, order) => sum + orderTotal(order), 0);
    const orderIds = new Set(orders.map((order) => String(order.id)));

    const encaisseRaw = arr(payments)
      .filter(
        (payment) =>
          orderIds.has(String(paymentOrderId(payment) || '')) ||
          monthKeyOf(payment.date || payment.created_at || payment.paid_at || payment.date_paiement) === key
      )
      .reduce((sum, payment) => sum + paymentAmount(payment), 0);

    const encaisse = ca > 0 ? Math.min(ca, encaisseRaw) : encaisseRaw;

    return {
      label: monthLabel(key),
      ca,
      encaisse,
      reste: Math.max(0, ca - encaisse),
    };
  });
}

export default function Dashboard({
  lotsData = [],
  animaux = [],
  vaccins = [],
  stocks = [],
  clients = [],
  cultures = [],
  salesOrders = [],
  payments = [],
  transactions = [],
  alimentationLogs = [],
  productionLogs = [],
  opportunities = [],
  taches = [],
  alertes = [],
  equipements = [],
  businessEvents = [],
  fournisseurs = [],
  meteo,
  onNavigate,
  onRefresh,
}) {
  const [refreshing, setRefreshing] = useState(false);

  const finance = consolidateFinance({
    transactions,
    salesOrders,
    payments,
    fournisseurs,
    stocks,
  });

  const unifiedOpportunities = deriveSalesOpportunities({
    opportunities,
    lots: lotsData,
    animaux,
    cultures,
    stocks,
    alimentationLogs,
    productionLogs,
    vaccins,
    marketPrices: props.marketPrices || [],
  });

  const monthlyActivity = useMemo(
    () => buildMonthlyActivity({ salesOrders, payments }),
    [salesOrders, payments]
  );

  const malades = animaux.filter((animal) => animal.health_status === 'malade').length;
  const vaccinsRetard = vaccins.filter((vaccin) => vaccin.statut === 'retard').length;
  const stocksCritiques = stocks.filter((stock) => calculateStockMetrics(stock).critical).length;
  const culturesRisque = cultures.filter((culture) => calculateCultureMetrics(culture).healthScore < 80 || culture.statut === 'perdu').length;

  const lotMetrics = (lot) => calculateLotMetrics({
    lot,
    feedingLogs: alimentationLogs,
    productionLogs,
  });

  const productionOeufsJour = lotsData.reduce(
    (sum, lot) => sum + lotMetrics(lot).eggMetrics.todayEggs,
    0
  );

  const tasksOpen = arr(taches).filter(isOpenTask).length;
  const tasksLate = arr(taches).filter((task) => lower(task.status || task.statut) === 'retard').length;
  const tasksDone = arr(taches).filter((task) => ['termine', 'terminé', 'done'].includes(lower(task.status || task.statut))).length;

  const realAlertsOpen = arr(alertes).filter(isOpenAlert).length;
  const realAlertsCritical = arr(alertes).filter(
    (alert) => isOpenAlert(alert) && ['critique', 'urgence'].includes(lower(alert.severity || alert.gravite))
  ).length;

  const recommendationsCount =
    malades +
    vaccinsRetard +
    stocksCritiques +
    culturesRisque +
    (finance.cashNet < 0 ? 1 : 0) +
    (finance.creancesReelles > 0 ? 1 : 0);

  const opportunitiesOpen = unifiedOpportunities.length;
  const actionsCount = tasksOpen + realAlertsOpen;

  const topAlerts = [
    realAlertsOpen > 0 && {
      type: realAlertsCritical ? 'danger' : 'amber',
      title: 'Alertes à traiter',
      text: `${realAlertsOpen} alerte(s) ouvertes`,
      module: 'alertes',
    },
    tasksOpen > 0 && {
      type: 'amber',
      title: 'Tâches à terminer',
      text: `${tasksOpen} tâche(s) ouvertes`,
      module: 'taches',
    },
    finance.cashNet < 0 && {
      type: 'danger',
      title: 'Cash à surveiller',
      text: `${fmtCurrency(finance.cashNet)} disponibles`,
      module: 'finances',
    },
    finance.creancesReelles > 0 && {
      type: 'amber',
      title: 'Paiements à récupérer',
      text: `${fmtCurrency(finance.creancesReelles)} à encaisser`,
      module: 'clients',
    },
    opportunitiesOpen > 0 && {
      type: 'amber',
      title: 'Ventes possibles',
      text: `${opportunitiesOpen} source(s) à convertir`,
      module: 'ventes',
    },
    stocksCritiques > 0 && {
      type: 'amber',
      title: 'Stock à vérifier',
      text: `${stocksCritiques} produit(s) sous le seuil`,
      module: 'stock',
    },
  ].filter(Boolean).slice(0, 5);

  const weatherImpact = meteo?.impact || 'Surveiller eau, ventilation et stocks sensibles.';
  const weatherAdvice = (meteo?.recommendations || [])[0] || 'Maintenir les routines terrain et contrôler les points sensibles.';

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await onRefresh?.();
      toast.success('Accueil actualisé');
    } catch (error) {
      toast.error(error.message || 'Actualisation impossible');
    } finally {
      setRefreshing(false);
    }
  };

  const quickActions = [
    { label: 'Finances', module: 'finances' },
    { label: 'Ventes', module: 'ventes' },
    { label: 'Stock', module: 'stock' },
    { label: 'Tâches', module: 'taches' },
    { label: 'Alertes', module: 'alertes' },
  ];

  const mainCards = [
    {
      label: 'Cash',
      value: fmtCurrency(finance.cashNet),
      module: 'finances',
      tone: finance.cashNet >= 0 ? 'text-emerald-300' : 'text-red-300',
    },
    {
      label: 'Bénéfice',
      value: fmtCurrency(finance.margeReelle),
      module: 'finances',
      tone: finance.margeReelle >= 0 ? 'text-emerald-300' : 'text-red-300',
    },
    {
      label: 'Ventes',
      value: fmtCurrency(finance.caConsolide),
      module: 'finances',
      tone: 'text-emerald-300',
    },
    {
      label: 'Reste à encaisser',
      value: fmtCurrency(finance.creancesReelles),
      module: 'clients',
      tone: finance.creancesReelles > 0 ? 'text-amber-300' : 'text-emerald-300',
    },
    {
      label: 'Actions terrain',
      value: actionsCount,
      module: actionsCount ? 'alertes' : 'taches',
      tone: actionsCount > 0 ? 'text-amber-300' : 'text-emerald-300',
    },
    {
      label: 'Œufs/jour',
      value: fmtNumber(productionOeufsJour),
      module: 'avicole',
      tone: 'text-sky-300',
    },
  ];

  const taskRows = [
    { label: 'Tâches ouvertes', value: tasksOpen },
    { label: 'Retard', value: tasksLate },
    { label: 'Terminées', value: tasksDone },
    { label: 'Alertes ouvertes', value: realAlertsOpen },
  ];

  const activityRows = [
    { label: 'Animaux', value: animaux.length },
    { label: 'Lots', value: lotsData.length },
    { label: 'Cultures', value: cultures.length },
    { label: 'Clients', value: clients.length },
    { label: 'Stock faible', value: stocksCritiques },
    { label: 'Points à surveiller', value: recommendationsCount },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Accueil"
        sub="Pilotage de la ferme : chiffres, actions terrain et priorités"
        actions={
          <Btn
            icon={RefreshCw}
            variant="outline"
            small
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </Btn>
        }
      />

      <div className="bg-[#2f2415] text-white border border-[#c9a96a]/40 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col gap-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#c9a96a] font-bold">
              Pilotage ferme
            </p>
            <h2 className="text-xl font-black mt-1">L’essentiel à suivre</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.module}
                type="button"
                onClick={() => onNavigate?.(action.module)}
                className="text-xs rounded-full bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1.5 text-[#f4e6c8]"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {mainCards.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate?.(item.module)}
              className="text-left rounded-2xl bg-white/10 border border-white/10 p-3 hover:bg-white/15 transition-colors"
            >
              <p className="text-[11px] text-[#f4e6c8]/70">{item.label}</p>
              <p className={`text-lg font-black mt-1 ${item.tone}`}>{item.value}</p>
            </button>
          ))}
        </div>
      </div>

      <DashboardOperationsBridge
        opportunities={opportunities}
        lots={lotsData}
        animaux={animaux}
        cultures={cultures}
        stocks={stocks}
        taches={taches}
        alertes={alertes}
        equipements={equipements}
        businessEvents={businessEvents}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <MiniLineChart
          title="Ventes, encaissements et reste à encaisser"
          subtitle="6 derniers mois"
          rows={monthlyActivity}
          series={[
            { key: 'ca', label: 'Ventes' },
            { key: 'encaisse', label: 'Encaissé' },
            { key: 'reste', label: 'Reste' },
          ]}
        />

        <MiniDonut
          title="Actions terrain"
          subtitle="Tâches et alertes ouvertes"
          rows={taskRows}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <MiniBarChart
          title="Activités clés"
          subtitle="Résumé par domaine"
          rows={activityRows}
        />

        <MiniBarChart
          title="Ventes mensuelles"
          subtitle="Progression des ventes par mois"
          rows={monthlyActivity}
          valueKey="ca"
          currency
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-3">Priorités du jour</p>

          <div className="space-y-2">
            {topAlerts.length ? (
              topAlerts.map((alert) => (
                <button
                  key={alert.title}
                  type="button"
                  onClick={() => onNavigate?.(alert.module)}
                  className={`w-full text-left rounded-xl border p-3 ${
                    alert.type === 'danger'
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-amber-500/10 border-amber-500/20'
                  }`}
                >
                  <p className="text-sm font-semibold text-[#2f2415]">{alert.title}</p>
                  <p className="text-xs text-[#8a7456]">{alert.text}</p>
                </button>
              ))
            ) : (
              <p className="text-sm text-[#8a7456]">Aucune priorité urgente.</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-r from-sky-900/80 via-sky-800/60 to-[#2f2415] border border-sky-700/30 rounded-3xl p-5 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              {meteo?.isDay ? (
                <Sun size={30} className="text-amber-300" />
              ) : (
                <Moon size={30} className="text-sky-200" />
              )}
            </div>

            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.22em] text-sky-200">Météo terrain</p>
              <p className="text-lg font-black">{meteo?.condition || 'Conditions locales'}</p>
              <p className="text-xs text-sky-100">{weatherImpact}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 min-w-[220px]">
              <WeatherPill
                icon={Thermometer}
                label="Temp."
                value={`${meteo?.temp ?? '-'}C`}
                sub={`Ress. ${meteo?.apparentTemp ?? '-'}C`}
              />

              <WeatherPill
                icon={Droplets}
                label="Hum."
                value={`${meteo?.humidite ?? '-'}%`}
                sub="air"
              />

              <WeatherPill
                icon={CloudRain}
                label="Pluie"
                value={meteo?.pluie ? 'Oui' : 'Non'}
                sub={`${meteo?.precipitationProbability ?? 0}%`}
              />

              <WeatherPill
                icon={Wind}
                label="Vent"
                value={`${meteo?.windSpeed ?? 0}`}
                sub="km/h"
              />
            </div>
          </div>

          <p className="mt-3 text-sm text-emerald-100 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3">
            {weatherAdvice}
          </p>
        </div>
      </div>

      <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
        <p className="font-semibold text-[#2f2415] mb-3">Santé & stock</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStatus
            icon={Heart}
            label="Malades"
            value={malades}
            danger={malades > 0}
            onClick={() => onNavigate?.('animaux')}
          />

          <MiniStatus
            icon={Syringe}
            label="Santé"
            value={vaccinsRetard}
            danger={vaccinsRetard > 0}
            onClick={() => onNavigate?.('sante')}
          />

          <MiniStatus
            icon={Package}
            label="Stocks"
            value={stocksCritiques}
            danger={stocksCritiques > 0}
            onClick={() => onNavigate?.('stock')}
          />

          <MiniStatus
            icon={Users}
            label="Clients"
            value={clients.length}
            onClick={() => onNavigate?.('clients')}
          />
        </div>
      </div>
    </div>
  );
}

function WeatherPill({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
      <div className="flex items-center gap-2 text-xs text-sky-100">
        <Icon size={13} />
        <span>{label}</span>
      </div>

      <p className="text-base font-black mt-1">{value}</p>

      {sub ? (
        <p className="text-[11px] text-sky-100/75 mt-0.5 truncate">{sub}</p>
      ) : null}
    </div>
  );
}

function MiniStatus({ icon: Icon, label, value, danger = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl bg-[#fffdf8] border border-[#e7d9be] p-3 text-left hover:bg-[#f8f0df]"
    >
      <Icon size={16} className={danger ? 'text-red-500' : 'text-[#c9a96a]'} />

      <p className="text-xs text-[#8a7456] mt-2">{label}</p>

      <p className={`text-lg font-black ${danger ? 'text-red-500' : 'text-[#2f2415]'}`}>
        {value}
      </p>
    </button>
  );
}