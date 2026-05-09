import {
  AlertTriangle,
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
import { useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import SectionHeader from '../components/SectionHeader';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { buildFinanceSummary } from '../utils/financeSummary';
import { calculateCultureMetrics, calculateLotMetrics, calculateStockMetrics } from '../utils/businessCalculations';
import { deriveSalesOpportunities } from '../utils/salesOpportunityDerivation';
import DashboardOperationsBridge from './DashboardOperationsBridge.jsx';

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
  meteo,
  onNavigate,
  onRefresh,
}) {
  const [refreshing, setRefreshing] = useState(false);
  const finance = buildFinanceSummary({ transactions, salesOrders, payments });
  const unifiedOpportunities = deriveSalesOpportunities({ opportunities, lots: lotsData, animaux, cultures, stocks });

  const malades = animaux.filter((a) => a.health_status === 'malade').length;
  const vaccinsRetard = vaccins.filter((v) => v.statut === 'retard').length;
  const stocksCritiques = stocks.filter((s) => calculateStockMetrics(s).critical).length;
  const culturesRisque = cultures.filter((c) => calculateCultureMetrics(c).healthScore < 80 || c.statut === 'perdu').length;
  const lotMetrics = (lot) => calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs });
  const productionOeufsJour = lotsData.reduce((sum, lot) => sum + lotMetrics(lot).eggMetrics.todayEggs, 0);
  const tasksOpen = taches.filter((t) => !['termine', 'terminé', 'annule', 'annulé', 'done'].includes(String(t.status || t.statut || '').toLowerCase())).length;
  const opportunitiesOpen = unifiedOpportunities.length;
  const equipmentIssues = equipements.filter((e) => ['panne', 'maintenance', 'hors_service'].includes(String(e.status || e.statut || '').toLowerCase())).length;
  const alertesCount = malades + vaccinsRetard + stocksCritiques + culturesRisque + tasksOpen + opportunitiesOpen + equipmentIssues + (finance.cashDisponible < 0 ? 1 : 0) + (finance.totalCreances > 0 ? 1 : 0);

  const topAlerts = [
    finance.cashDisponible < 0 && { type: 'danger', title: 'Trésorerie négative', text: `${fmtCurrency(finance.cashDisponible)} disponibles`, module: 'finances' },
    finance.totalCreances > 0 && { type: 'amber', title: 'Créances clients', text: `${fmtCurrency(finance.totalCreances)} à encaisser`, module: 'clients' },
    opportunitiesOpen > 0 && { type: 'amber', title: 'Opportunités ouvertes', text: `${opportunitiesOpen} source(s) à convertir`, module: 'ventes' },
    tasksOpen > 0 && { type: 'amber', title: 'Tâches à suivre', text: `${tasksOpen} tâche(s) ouverte(s)`, module: 'taches' },
    stocksCritiques > 0 && { type: 'amber', title: 'Stock critique', text: `${stocksCritiques} produit(s) à vérifier`, module: 'stock' },
    vaccinsRetard > 0 && { type: 'danger', title: 'Santé en retard', text: `${vaccinsRetard} action(s) santé`, module: 'sante' },
  ].filter(Boolean).slice(0, 5);

  const weatherImpact = meteo?.impact || 'Surveiller eau, ventilation et stocks sensibles.';
  const weatherAdvice = (meteo?.recommendations || [])[0] || 'Maintenir les routines terrain et contrôler les points sensibles.';

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await onRefresh?.();
      toast.success('Dashboard actualisé');
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
    { label: 'Cash', value: fmtCurrency(finance.cashDisponible), module: 'finances', tone: finance.cashDisponible >= 0 ? 'text-emerald-300' : 'text-red-300' },
    { label: 'Bénéfice', value: fmtCurrency(finance.benefice), module: 'finances', tone: finance.benefice >= 0 ? 'text-emerald-300' : 'text-red-300' },
    { label: 'CA', value: fmtCurrency(finance.totalRecettes), module: 'finances', tone: 'text-emerald-300' },
    { label: 'Créances', value: fmtCurrency(finance.totalCreances), module: 'clients', tone: finance.totalCreances > 0 ? 'text-amber-300' : 'text-emerald-300' },
    { label: 'Actions', value: alertesCount, module: 'alertes', tone: alertesCount > 0 ? 'text-amber-300' : 'text-emerald-300' },
    { label: 'Œufs/jour', value: fmtNumber(productionOeufsJour), module: 'avicole', tone: 'text-sky-300' },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="Dashboard" sub="Vue dirigeant: chiffres, alertes et priorités" actions={<Btn icon={RefreshCw} variant="outline" small onClick={handleRefresh} disabled={refreshing}>{refreshing ? 'Actualisation...' : 'Actualiser'}</Btn>} />

      <div className="bg-[#2f2415] text-white border border-[#c9a96a]/40 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col gap-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#c9a96a] font-bold">Dashboard dirigeant</p>
            <h2 className="text-xl font-black mt-1">Essentiel de l’exploitation</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => <button key={action.module} type="button" onClick={() => onNavigate?.(action.module)} className="text-xs rounded-full bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1.5 text-[#f4e6c8]">{action.label}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {mainCards.map((item) => (
            <button key={item.label} type="button" onClick={() => onNavigate?.(item.module)} className="text-left rounded-2xl bg-white/10 border border-white/10 p-3 hover:bg-white/15 transition-colors">
              <p className="text-[11px] text-[#f4e6c8]/70">{item.label}</p>
              <p className={`text-lg font-black mt-1 ${item.tone}`}>{item.value}</p>
            </button>
          ))}
        </div>
      </div>

      <DashboardOperationsBridge opportunities={opportunities} lots={lotsData} animaux={animaux} cultures={cultures} stocks={stocks} taches={taches} alertes={alertes} equipements={equipements} businessEvents={businessEvents} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-3">Priorités du jour</p>
          <div className="space-y-2">
            {topAlerts.length ? topAlerts.map((alert) => (
              <button key={alert.title} type="button" onClick={() => onNavigate?.(alert.module)} className={`w-full text-left rounded-xl border p-3 ${alert.type === 'danger' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                <p className="text-sm font-semibold text-[#2f2415]">{alert.title}</p>
                <p className="text-xs text-[#8a7456]">{alert.text}</p>
              </button>
            )) : <p className="text-sm text-[#8a7456]">Aucune priorité critique.</p>}
          </div>
        </div>

        <div className="bg-gradient-to-r from-sky-900/80 via-sky-800/60 to-[#2f2415] border border-sky-700/30 rounded-3xl p-5 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">{meteo?.isDay ? <Sun size={30} className="text-amber-300" /> : <Moon size={30} className="text-sky-200" />}</div>
            <div className="flex-1"><p className="text-xs uppercase tracking-[0.22em] text-sky-200">Météo terrain</p><p className="text-lg font-black">{meteo?.condition || 'Conditions locales'}</p><p className="text-xs text-sky-100">{weatherImpact}</p></div>
            <div className="grid grid-cols-2 gap-2 min-w-[220px]"><WeatherPill icon={Thermometer} label="Temp." value={`${meteo?.temp ?? '-'}C`} sub={`Ress. ${meteo?.apparentTemp ?? '-'}C`} /><WeatherPill icon={Droplets} label="Hum." value={`${meteo?.humidite ?? '-'}%`} sub="air" /><WeatherPill icon={CloudRain} label="Pluie" value={meteo?.pluie ? 'Oui' : 'Non'} sub={`${meteo?.precipitationProbability ?? 0}%`} /><WeatherPill icon={Wind} label="Vent" value={`${meteo?.windSpeed ?? 0}`} sub="km/h" /></div>
          </div>
          <p className="mt-3 text-sm text-emerald-100 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3">{weatherAdvice}</p>
        </div>
      </div>

      <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
        <p className="font-semibold text-[#2f2415] mb-3">Santé & stock</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStatus icon={Heart} label="Malades" value={malades} danger={malades > 0} onClick={() => onNavigate?.('animaux')} />
          <MiniStatus icon={Syringe} label="Santé" value={vaccinsRetard} danger={vaccinsRetard > 0} onClick={() => onNavigate?.('sante')} />
          <MiniStatus icon={Package} label="Stocks" value={stocksCritiques} danger={stocksCritiques > 0} onClick={() => onNavigate?.('stock')} />
          <MiniStatus icon={Users} label="Clients" value={clients.length} onClick={() => onNavigate?.('clients')} />
        </div>
      </div>
    </div>
  );
}

function WeatherPill({ icon: Icon, label, value, sub }) {
  return <div className="rounded-2xl bg-white/10 border border-white/10 p-3"><div className="flex items-center gap-2 text-xs text-sky-100"><Icon size={13} /><span>{label}</span></div><p className="text-base font-black mt-1">{value}</p>{sub ? <p className="text-[11px] text-sky-100/75 mt-0.5 truncate">{sub}</p> : null}</div>;
}

function MiniStatus({ icon: Icon, label, value, danger = false, onClick }) {
  return <button type="button" onClick={onClick} className="rounded-xl bg-[#fffdf8] border border-[#e7d9be] p-3 text-left hover:bg-[#f8f0df]"><Icon size={16} className={danger ? 'text-red-500' : 'text-[#c9a96a]'} /><p className="text-xs text-[#8a7456] mt-2">{label}</p><p className={`text-lg font-black ${danger ? 'text-red-500' : 'text-[#2f2415]'}`}>{value}</p></button>;
}
