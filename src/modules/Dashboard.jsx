import {
  Activity,
  AlertTriangle,
  BarChart2,
  Beef,
  Bird,
  Cloud,
  CloudRain,
  Droplets,
  Heart,
  MapPin,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  Syringe,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Weight,
  Wind,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { financeData } from '../utils/mockData';
import { getFeedingKpis } from '../utils/alimentation';
import { calculateClientMetrics, calculateCultureMetrics, calculateLotMetrics, calculateLotSaleReadiness, calculateStockMetrics } from '../utils/businessCalculations';

export default function Dashboard({ lotsData = [], animaux = [], vaccins = [], stocks = [], clients = [], cultures = [], alimentationLogs = [], productionLogs = [], meteo, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const totalRecettes = financeData.reduce((s, d) => s + d.recettes, 0);
  const totalDepenses = financeData.reduce((s, d) => s + d.depenses, 0);
  const benefice = totalRecettes - totalDepenses;
  const marge = totalRecettes ? ((benefice / totalRecettes) * 100).toFixed(1) : '0.0';

  const animauxActifs = animaux.filter((a) => !['vendu', 'mort', 'vole', 'reforme'].includes(a.status)).length;
  const malades = animaux.filter((a) => a.health_status === 'malade').length;
  const vaccinsRetard = vaccins.filter((v) => v.statut === 'retard').length;
  const stocksCritiques = stocks.filter((s) => calculateStockMetrics(s).critical).length;
  const culturesRisque = cultures.filter((c) => calculateCultureMetrics(c).healthScore < 80 || c.statut === 'perdu').length;
  const premierMalade = animaux.find((a) => a.health_status === 'malade');
  const premierStockCritique = stocks.find((s) => calculateStockMetrics(s).critical);
  const premierVaccinRetard = vaccins.find((v) => v.statut === 'retard');
  const premiereCultureRisque = cultures.find((c) => calculateCultureMetrics(c).healthScore < 80 || c.statut === 'perdu');
  const lotMetrics = (lot) => calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs });
  const totalInitialLots = lotsData.reduce((sum, lot) => sum + Number(lot.initial_count || 0), 0);
  const totalMortalityLots = lotsData.reduce((sum, lot) => sum + Number(lot.mortality || 0), 0);
  const mortalityRate = totalInitialLots > 0 ? (totalMortalityLots / totalInitialLots) * 100 : 0;
  const productionOeufsJour = lotsData.reduce((sum, lot) => sum + lotMetrics(lot).eggMetrics.todayEggs, 0);
  const totalTetesLots = lotsData.reduce((s, l) => s + lotMetrics(l).currentCount, 0);
  const lotFaible = [...lotsData].sort((a, b) => lotMetrics(a).scoreSante - lotMetrics(b).scoreSante)[0];
  const meilleurClient = [...clients].sort((a, b) => calculateClientMetrics(b).total - calculateClientMetrics(a).total)[0];
  const animauxPretsVente = animaux.filter((a) => a.pret_vente_confirme || a.pret_vente_recommande || ['pret_a_la_vente', 'reserve'].includes(a.status) || ['recommande_pret', 'pret_confirme'].includes(a.sale_readiness_status));
  const lotsPretsVente = lotsData.filter((lot) => {
    const readiness = calculateLotSaleReadiness(lot, lotMetrics(lot));
    return lot.pret_vente_confirme || lot.pret_vente_recommande || readiness.recommended || ['pret_a_la_vente', 'pret_a_vendre_reforme'].includes(lot.status);
  });
  const plateauxDisponibles = Math.floor(productionOeufsJour / 30);
  const kgCulturesDisponibles = cultures.reduce((sum, culture) => sum + Number(culture.quantite_disponible ?? culture.quantite_recoltee ?? 0), 0);
  const clientsARelancer = clients.filter((client) => ['a_relancer', 'inactif'].includes(client.statut) || calculateClientMetrics(client).smartStatus === 'a_relancer');
  const valeurPotentielleOpportunites =
    animauxPretsVente.reduce((sum, animal) => sum + Number(animal.prix_vente_reel || animal.sale_price || animal.prix_vente_estime || 0), 0) +
    lotsPretsVente.reduce((sum, lot) => sum + lotMetrics(lot).grossRevenue, 0) +
    plateauxDisponibles * 2000 +
    kgCulturesDisponibles * 150;
  const feedingKpis = getFeedingKpis({ logs: alimentationLogs, animals: animaux, lots: lotsData });
  const weatherAlerts = (meteo?.alerts || []).map((msg) => ({ type: meteo.riskLevel === 'critique' ? 'danger' : 'amber', msg }));
  const weatherRecommendations = (meteo?.recommendations || []).map((msg) => ({ icon: 'Meteo', msg }));

  const alertes = [
    malades > 0 && { type: 'danger', msg: `${premierMalade?.name || 'Animal'} malade: verifier poids, temperature et traitement aujourd'hui` },
    vaccinsRetard > 0 && { type: 'danger', msg: `${premierVaccinRetard?.nom || 'Vaccin'} en retard pour ${premierVaccinRetard?.animal || 'un animal'}` },
    stocksCritiques > 0 && { type: 'amber', msg: `${premierStockCritique?.produit || 'Stock'} critique: ${premierStockCritique?.quantite}/${premierStockCritique?.seuil} ${premierStockCritique?.unite || ''}`.trim() },
    culturesRisque > 0 && { type: 'amber', msg: `${premiereCultureRisque?.nom || 'Culture'} a surveiller: score sante ${calculateCultureMetrics(premiereCultureRisque).healthScore.toFixed(0)}%` },
    ...weatherAlerts.slice(0, 3),
    { type: 'info', msg: meteo?.impact || 'Meteo indisponible' },
    { type: 'success', msg: 'Synchronisation cloud effectuee' },
  ].filter(Boolean);

  const recommandations = [
    lotFaible && lotMetrics(lotFaible).scoreSante < 90 && { icon: 'Lot', msg: `${lotFaible.name || lotFaible.id} est le lot le plus fragile (${lotMetrics(lotFaible).scoreSante.toFixed(0)}% sante). Priorite: verifier mortalite, alimentation et ventilation.` },
    premierStockCritique && { icon: 'Stock', msg: `Commander ${premierStockCritique.produit}: niveau ${premierStockCritique.quantite}/${premierStockCritique.seuil} ${premierStockCritique.unite || ''}.` },
    premierVaccinRetard && { icon: 'Sante', msg: `Planifier ${premierVaccinRetard.nom} avec ${premierVaccinRetard.vet || 'un veterinaire'} avant nouvelle vente.` },
    premierMalade && { icon: 'Animal', msg: `Isoler ${premierMalade.name || premierMalade.id}, noter symptomes et contacter le veterinaire si evolution negative.` },
    premiereCultureRisque && { icon: 'Culture', msg: `Controle terrain sur ${premiereCultureRisque.nom}: ajuster arrosage/fertilisation selon humidite et parasites.` },
    meilleurClient && { icon: 'Client', msg: `Relancer ${meilleurClient.nom}: meilleur potentiel commercial (${fmtCurrency(calculateClientMetrics(meilleurClient).total)} d'achats).` },
    ...weatherRecommendations,
  ].filter(Boolean).slice(0, 6);

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
    <div className="space-y-6">
      <SectionHeader
        title="Tableau de bord"
        sub="Vue globale et temps reel de l'exploitation - Horizon Farm"
        actions={<Btn icon={RefreshCw} variant="outline" small onClick={handleRefresh} disabled={refreshing}>{refreshing ? 'Actualisation...' : 'Actualiser'}</Btn>}
      />

      <div className="bg-[#2f2415] text-white border border-[#c9a96a]/40 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#c9a96a] font-bold">Dashboard dirigeant</p>
            <h2 className="text-xl font-black mt-1">Vue ultra simple pour decision rapide</h2>
          </div>
          <span className="text-xs rounded-full bg-[#c9a96a]/20 border border-[#c9a96a]/40 px-3 py-1 text-[#f4e6c8]">Mode proprietaire</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: 'Benefice', value: fmtCurrency(benefice), tone: 'text-emerald-300' },
            { label: 'Alertes', value: alertes.filter((a) => a.type === 'danger' || a.type === 'amber').length, tone: 'text-amber-300' },
            { label: 'Mortalite', value: `${mortalityRate.toFixed(1)}%`, tone: 'text-red-300' },
            { label: 'Production', value: fmtNumber(productionOeufsJour), tone: 'text-sky-300' },
            { label: 'Cash', value: fmtCurrency(benefice), tone: 'text-emerald-300' },
            { label: 'Risques', value: malades + vaccinsRetard + stocksCritiques + culturesRisque, tone: 'text-orange-300' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-white/10 border border-white/10 p-3">
              <p className="text-[11px] text-[#f4e6c8]/70">{item.label}</p>
              <p className={`text-lg font-black mt-1 ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-sky-900/80 via-sky-800/60 to-[#2f2415] border border-sky-700/30 rounded-3xl p-5 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex items-center gap-4 min-w-56">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
              {meteo?.isDay ? <Sun size={30} className="text-amber-300" /> : <Moon size={30} className="text-sky-200" />}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-sky-200">Meteo terrain</p>
              <p className="text-lg font-black">{meteo?.condition || 'Conditions locales'}</p>
              <p className="text-xs text-sky-100">{meteo?.moment || 'Jour'} - risque {meteo?.riskLevel || 'stable'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 flex-1">
            <WeatherPill icon={Thermometer} label="Temp." value={`${meteo?.temp ?? '-'}C`} sub={`Ress. ${meteo?.apparentTemp ?? '-'}C`} />
            <WeatherPill icon={Droplets} label="Humidite" value={`${meteo?.humidite ?? '-'}%`} sub="air actuel" />
            <WeatherPill icon={CloudRain} label="Pluie" value={meteo?.pluie ? 'Oui' : 'Non'} sub={`${meteo?.precipitationProbability ?? 0}% prev.`} />
            <WeatherPill icon={Wind} label="Vent" value={`${meteo?.windSpeed ?? 0} km/h`} sub={meteo?.windLabel || '-'} />
            <WeatherPill icon={Cloud} label="Nuages" value={`${meteo?.cloudCover ?? 0}%`} sub={meteo?.thermalLabel || 'doux'} />
            <WeatherPill icon={Sun} label="Lever" value={meteo?.sunrise || '--:--'} sub="soleil" />
            <WeatherPill icon={Moon} label="Coucher" value={meteo?.sunset || '--:--'} sub="soleil" />
            <WeatherPill icon={MapPin} label="Position" value={meteo?.locationLabel || 'Senegal'} sub={meteo?.updatedAt ? new Date(meteo.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'live'} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="text-sm text-amber-100 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
            {meteo?.impact}
          </div>
          <div className="text-sm text-emerald-100 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3">
            {(meteo?.recommendations || [])[0] || 'Conditions stables: maintenir les routines terrain et verifier les stocks critiques.'}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#b39b78] uppercase tracking-widest mb-3">Indicateurs Financiers</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={TrendingUp} label="Chiffre d'affaires" value={fmtCurrency(totalRecettes)} color="bg-emerald-500/20 text-emerald-400" trend={8} />
          <KpiCard icon={TrendingDown} label="Depenses totales" value={fmtCurrency(totalDepenses)} color="bg-red-500/20 text-red-400" trend={-3} />
          <KpiCard icon={BarChart2} label="Benefice net" value={fmtCurrency(benefice)} color="bg-sky-500/20 text-sky-400" trend={12} />
          <KpiCard icon={BarChart2} label="Marge globale" value={`${marge}%`} sub="Objectif: 40%" color="bg-amber-500/20 text-amber-400" trend={2} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#b39b78] uppercase tracking-widest mb-3">Production & Elevage</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Beef} label="Animaux actifs" value={fmtNumber(animauxActifs)} sub="bovins + ovins + caprins" color="bg-amber-500/20 text-amber-400" />
          <KpiCard icon={Bird} label="Lots avicoles" value={lotsData.length} sub={`${fmtNumber(totalTetesLots)} tetes calculees`} color="bg-emerald-500/20 text-emerald-400" />
          <KpiCard icon={Activity} label="Production/jour (oeufs)" value={fmtNumber(productionOeufsJour)} sub="Depuis journal production" color="bg-sky-500/20 text-sky-400" trend={5} />
          <KpiCard icon={Weight} label="Cultures actives" value={cultures.filter((c) => !['termine', 'perdu'].includes(c.statut)).length} sub="maraichage" color="bg-purple-500/20 text-purple-400" trend={3} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#b39b78] uppercase tracking-widest mb-3">Opportunites commerciales</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard icon={Beef} label="Animaux prets" value={animauxPretsVente.length} sub="Opportunite, pas alerte" color="bg-emerald-500/20 text-emerald-400" />
          <KpiCard icon={Bird} label="Lots chair / reforme" value={lotsPretsVente.length} color="bg-sky-500/20 text-sky-400" />
          <KpiCard icon={Bird} label="Plateaux disponibles" value={fmtNumber(plateauxDisponibles)} color="bg-amber-500/20 text-amber-400" />
          <KpiCard icon={Weight} label="Cultures disponibles" value={`${fmtNumber(kgCulturesDisponibles)} kg`} color="bg-lime-500/20 text-lime-500" />
          <KpiCard icon={TrendingUp} label="Valeur potentielle" value={fmtCurrency(valeurPotentielleOpportunites)} sub={`${clientsARelancer.length} clients a relancer`} color="bg-purple-500/20 text-purple-400" />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#b39b78] uppercase tracking-widest mb-3">Sante & Stock</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Heart} label="Animaux malades" value={malades} color="bg-red-500/20 text-red-400" />
          <KpiCard icon={Syringe} label="Vaccins en retard" value={vaccinsRetard} color="bg-red-500/20 text-red-400" />
          <KpiCard icon={AlertTriangle} label="Stocks critiques" value={stocksCritiques} color="bg-amber-500/20 text-amber-400" />
          <KpiCard icon={ShieldCheck} label="Taux mortalite moyen" value={`${mortalityRate.toFixed(1)}%`} sub="Objectif < 5%" color={mortalityRate < 5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#b39b78] uppercase tracking-widest mb-3">Alimentation calculee</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard icon={Beef} label="Alim. bovins" value={fmtCurrency(feedingKpis.bovin)} color="bg-amber-500/20 text-amber-400" />
          <KpiCard icon={Beef} label="Alim. ovins" value={fmtCurrency(feedingKpis.ovin)} color="bg-lime-500/20 text-lime-500" />
          <KpiCard icon={Beef} label="Alim. caprins" value={fmtCurrency(feedingKpis.caprin)} color="bg-orange-500/20 text-orange-400" />
          <KpiCard icon={Bird} label="Alim. avicole" value={fmtCurrency(feedingKpis.avicole)} color="bg-sky-500/20 text-sky-400" />
          <KpiCard icon={Weight} label="Cout moyen/tete" value={fmtCurrency(feedingKpis.averagePerHead)} color="bg-emerald-500/20 text-emerald-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-4">Evolution financiere 6 mois</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={financeData}>
              <defs>
                <linearGradient id="recG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="depG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d6c3a0" />
              <XAxis dataKey="mois" stroke="#8a7456" fontSize={12} />
              <YAxis stroke="#8a7456" fontSize={10} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v) => fmtCurrency(v)} contentStyle={{ background: '#ffffff', border: '1px solid #b6975f', borderRadius: 8 }} />
              <Area type="monotone" dataKey="recettes" stroke="#22c55e" fill="url(#recG)" strokeWidth={2} name="Recettes" />
              <Area type="monotone" dataKey="depenses" stroke="#ef4444" fill="url(#depG)" strokeWidth={2} name="Depenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-4">Alertes intelligentes</p>
          <div className="space-y-3">
            {alertes.map((alert, i) => {
              const colors = {
                danger: 'border-red-500/30 bg-red-500/10 text-red-400',
                amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
                info: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
                success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
              };

              return (
                <div key={`${alert.msg}-${i}`} className={`p-2.5 rounded-lg border text-xs ${colors[alert.type]}`}>
                  {alert.msg}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#ffffff] to-[#f4ebdb] border border-[#d6c3a0] rounded-2xl p-5">
        <p className="font-semibold text-[#2f2415] mb-4 flex items-center gap-2"><Zap size={16} className="text-amber-400" />Recommandations intelligentes</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recommandations.map((rec) => (
            <div key={rec.msg} className="flex items-start gap-3 p-3 bg-[#fffdf8] rounded-xl border border-[#d6c3a0]">
              <span className="text-lg">{rec.icon}</span>
              <p className="text-sm text-[#7d6a4a]">{rec.msg}</p>
            </div>
          ))}
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
      {sub ? <p className="text-[11px] text-sky-100/75 mt-0.5 truncate">{sub}</p> : null}
    </div>
  );
}



