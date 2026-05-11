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
import { useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import SectionHeader from '../components/SectionHeader';
import { fmtCurrency } from '../utils/format';
import { buildFinanceSummary } from '../utils/financeSummary';
import { calculateCultureMetrics, calculateStockMetrics } from '../utils/businessCalculations';

export default function Dashboard({
  animaux = [],
  vaccins = [],
  stocks = [],
  clients = [],
  cultures = [],
  salesOrders = [],
  payments = [],
  transactions = [],
  meteo,
  onNavigate,
  onRefresh,
}) {
  const [refreshing, setRefreshing] = useState(false);
  const finance = buildFinanceSummary({ transactions, salesOrders, payments });

  const malades = animaux.filter((a) => a.health_status === 'malade').length;
  const vaccinsRetard = vaccins.filter((v) => v.statut === 'retard').length;
  const stocksCritiques = stocks.filter((s) => calculateStockMetrics(s).critical).length;
  const culturesRisque = cultures.filter((c) => calculateCultureMetrics(c).healthScore < 80 || c.statut === 'perdu').length;
  const alertesCount = malades + vaccinsRetard + stocksCritiques + culturesRisque + (finance.cashDisponible < 0 ? 1 : 0) + (finance.totalCreances > 0 ? 1 : 0);

  const topAlerts = [
    finance.cashDisponible < 0 && { type: 'danger', title: 'Tresorerie negative', text: `${fmtCurrency(finance.cashDisponible)} disponibles`, module: 'finances' },
    finance.totalCreances > 0 && { type: 'amber', title: 'Creances clients', text: `${fmtCurrency(finance.totalCreances)} a encaisser`, module: 'clients' },
    stocksCritiques > 0 && { type: 'amber', title: 'Stock critique', text: `${stocksCritiques} produit(s) a verifier`, module: 'stock' },
    vaccinsRetard > 0 && { type: 'danger', title: 'Vaccins en retard', text: `${vaccinsRetard} action(s) sante`, module: 'sante' },
  ].filter(Boolean).slice(0, 4);

  const weatherImpact = meteo?.impact || 'Surveiller eau, ventilation et stocks sensibles.';
  const weatherAdvice = (meteo?.recommendations || [])[0] || 'Maintenir les routines terrain et controler les points sensibles.';

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await onRefresh?.();
      toast.success('Dashboard actualise');
    } catch (error) {
      toast.error(error.message || 'Actualisation impossible');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Dashboard" sub="Vue dirigeant: chiffres, alertes et priorites" actions={<Btn icon={RefreshCw} variant="outline" small onClick={handleRefresh} disabled={refreshing}>{refreshing ? 'Actualisation...' : 'Actualiser'}</Btn>} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-3">Priorites du jour</p>
          <div className="space-y-2">
            {topAlerts.length ? topAlerts.map((alert) => (
              <button key={alert.title} type="button" onClick={() => onNavigate?.(alert.module)} className={`w-full text-left rounded-xl border p-3 ${alert.type === 'danger' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                <p className="text-sm font-semibold text-[#2f2415]">{alert.title}</p>
                <p className="text-xs text-[#8a7456]">{alert.text}</p>
              </button>
            )) : <p className="text-sm text-[#8a7456]">Aucune priorite critique.</p>}
          </div>
        </div>

        <div className="bg-gradient-to-r from-sky-900/80 via-sky-800/60 to-[#2f2415] border border-sky-700/30 rounded-3xl p-5 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">{meteo?.isDay ? <Sun size={30} className="text-amber-300" /> : <Moon size={30} className="text-sky-200" />}</div>
            <div className="flex-1"><p className="text-xs uppercase tracking-[0.22em] text-sky-200">Meteo terrain</p><p className="text-lg font-black">{meteo?.condition || 'Conditions locales'}</p><p className="text-xs text-sky-100">{weatherImpact}</p></div>
            <div className="grid grid-cols-2 gap-2 min-w-[220px]"><WeatherPill icon={Thermometer} label="Temp." value={`${meteo?.temp ?? '-'}C`} sub={`Ress. ${meteo?.apparentTemp ?? '-'}C`} /><WeatherPill icon={Droplets} label="Hum." value={`${meteo?.humidite ?? '-'}%`} sub="air" /><WeatherPill icon={CloudRain} label="Pluie" value={meteo?.pluie ? 'Oui' : 'Non'} sub={`${meteo?.precipitationProbability ?? 0}%`} /><WeatherPill icon={Wind} label="Vent" value={`${meteo?.windSpeed ?? 0}`} sub="km/h" /></div>
          </div>
          <p className="mt-3 text-sm text-emerald-100 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3">{weatherAdvice}</p>
        </div>
      </div>

      <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
        <p className="font-semibold text-[#2f2415] mb-3">Sante & stock</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStatus icon={Heart} label="Malades" value={malades} danger={malades > 0} onClick={() => onNavigate?.('animaux')} />
          <MiniStatus icon={Syringe} label="Vaccins" value={vaccinsRetard} danger={vaccinsRetard > 0} onClick={() => onNavigate?.('sante')} />
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
