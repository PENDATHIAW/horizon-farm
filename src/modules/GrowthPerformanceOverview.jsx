import { AlertTriangle, BarChart3, CheckCircle2, Leaf, Scale, TrendingUp } from 'lucide-react';
import { calculateAnimalCost, calculateAvicoleLotCost } from '../utils/costEngine';
import { calculateCultureMetrics } from '../utils/businessCalculations';
import { avicoleActiveCount, avicoleDeadCount } from '../utils/avicoleMetrics';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const daysBetween = (start) => { if (!start) return 0; const d = new Date(start); if (Number.isNaN(d.getTime())) return 0; return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)); };
const labelOf = (row = {}) => row.name || row.nom || row.tag || row.type || row.id || 'Sujet';
const animalWeight = (row = {}) => toNumber(row.poids ?? row.weight ?? row.current_weight ?? row.last_weight ?? row.poids_actuel ?? row.poids_moyen_actuel);
const entryWeight = (row = {}) => toNumber(row.poids_moyen_entree ?? row.weight_entry ?? row.poids_entree);
const targetWeight = (row = {}, fallback = 0) => toNumber(row.poids_objectif_vente ?? row.objectif_poids_moyen ?? row.target_weight ?? row.poids_cible ?? fallback);
const harvestQty = (row = {}) => toNumber(row.quantite_recoltee ?? row.production_reelle ?? row.quantite_disponible ?? row.quantite_prevue);
const surface = (row = {}) => toNumber(row.surface_exploitable ?? row.surface);
const cultureStage = (row = {}) => row.stade || row.phase || row.statut_culture || row.status || 'À suivre';
const statusText = (row = {}) => lower(`${row.status || ''} ${row.statut || ''} ${row.phase || ''} ${row.stage || ''} ${row.stade || ''}`);
const isTerminalStatus = (row = {}) => /cl[oô]tur|clos|termin|vendu|livr|abattu|transform|r[eé]form|mort|perdu|vol[ée]|r[eé]colt/.test(statusText(row));
const terminalLabel = (row = {}) => {
  const text = statusText(row);
  if (/vendu|livr/.test(text)) return 'Sorti / vendu';
  if (/abattu|transform/.test(text)) return 'Abattu / transformé';
  if (/mort|perdu|vol[ée]/.test(text)) return 'Perte enregistrée';
  if (/r[eé]colt/.test(text)) return 'Récolté';
  return 'Clôturé';
};

function Card({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p>
    <p className="mt-2 text-xl font-black text-[#2f2415]">{value}</p>
    {hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}
  </div>;
}

function riskBadge(level) {
  if (level === 'action') return <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700">Action requise</span>;
  if (level === 'closed') return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">Cycle terminé</span>;
  if (level === 'high') return <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Risque élevé</span>;
  if (level === 'medium') return <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">À surveiller</span>;
  return <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Correct</span>;
}

function zeroActiveLotDecision(lot = {}, cost = {}) {
  if (isTerminalStatus(lot)) {
    return {
      risk: 'closed',
      stage: terminalLabel(lot),
      action: 'Cycle terminé : vérifier marge finale, pièces et traçabilité.',
      current: '0 actif',
    };
  }
  return {
    risk: 'action',
    stage: 'À clôturer',
    action: 'Effectif à 0 : choisir vente, abattage/transformation, perte ou clôture du lot.',
    current: '0 actif',
  };
}

function avicoleRows({ rows, alimentationLogs, productionLogs, businessEvents }) {
  return arr(rows).map((lot) => {
    const age = daysBetween(lot.date_debut || lot.entry_date || lot.date_entree);
    const active = avicoleActiveCount(lot);
    const dead = avicoleDeadCount(lot);
    const initial = Math.max(1, toNumber(lot.initial_count ?? lot.effectif_initial ?? active + dead));
    const weight = animalWeight(lot);
    const entry = entryWeight(lot);
    const goal = targetWeight(lot, lot.type === 'Chair' ? 1.5 : 0);
    const cost = calculateAvicoleLotCost({ lot, alimentationLogs, productionLogs, directCharges: businessEvents, healthEvents: businessEvents, slaughterEvents: businessEvents });
    const mortalityRate = initial ? (dead / initial) * 100 : 0;
    const progression = goal > 0 && weight > 0 ? Math.min(120, (weight / goal) * 100) : 0;
    const gain = weight > 0 && entry > 0 ? weight - entry : 0;
    const gmq = age > 0 && gain > 0 ? gain / age : 0;
    if (active <= 0) {
      const decision = zeroActiveLotDecision(lot, cost);
      return { id: lot.id, label: labelOf(lot), group: lot.type || 'Avicole', age, stage: decision.stage, current: decision.current, target: goal ? `${goal.toFixed(2)} kg` : '—', progress: 0, metric: `${mortalityRate.toFixed(1)}% mortalité`, cost: cost.totalCost, unitCost: cost.costPerLiveSubject || cost.costPerInitialSubject, risk: decision.risk, action: decision.action };
    }
    const risk = mortalityRate > 8 || cost.costPerLiveSubject > cost.costPerInitialSubject * 1.25 ? 'high' : mortalityRate > 4 || (goal > 0 && progression < 75 && age > 25) ? 'medium' : 'low';
    const action = risk === 'high' ? 'Vérifier santé, alimentation et mortalité.' : risk === 'medium' ? 'Contrôler poids et consommation cette semaine.' : 'Suivi normal.';
    return { id: lot.id, label: labelOf(lot), group: lot.type || 'Avicole', age, stage: lot.phase || (lot.type === 'Chair' ? 'Croissance' : 'Production'), current: weight ? `${weight.toFixed(2)} kg` : `${fmtNumber(active)} actifs`, target: goal ? `${goal.toFixed(2)} kg` : '—', progress: progression, metric: gmq ? `${gmq.toFixed(3)} kg/j` : `${mortalityRate.toFixed(1)}% mortalité`, cost: cost.totalCost, unitCost: cost.costPerLiveSubject || cost.costPerInitialSubject, risk, action };
  });
}

function animalRows({ rows, alimentationLogs, vaccins, businessEvents }) {
  return arr(rows).map((animal) => {
    const age = daysBetween(animal.date_entree || animal.entry_date || animal.created_at);
    const weight = animalWeight(animal);
    const entry = toNumber(animal.poids_entree ?? animal.weight_entry ?? animal.poids_initial);
    const goal = targetWeight(animal, 0);
    const gain = weight > 0 && entry > 0 ? weight - entry : 0;
    const gmq = age > 0 && gain > 0 ? gain / age : 0;
    const cost = calculateAnimalCost({ animal, alimentationLogs, vaccins, healthEvents: businessEvents, directCharges: businessEvents, slaughterEvents: businessEvents });
    const progression = goal > 0 && weight > 0 ? Math.min(120, (weight / goal) * 100) : 0;
    const health = lower(animal.health_status || animal.statut_sante || animal.etat_sante);
    if (isTerminalStatus(animal)) {
      return { id: animal.id, label: labelOf(animal), group: animal.type || animal.espece || 'Animal', age, stage: terminalLabel(animal), current: weight ? `${weight.toFixed(2)} kg` : 'Sorti du suivi actif', target: goal ? `${goal.toFixed(2)} kg` : '—', progress: progression, metric: gmq ? `${gmq.toFixed(3)} kg/j` : 'Cycle terminé', cost: cost.totalCost, unitCost: cost.costPerKg, risk: 'closed', action: 'Sujet sorti du suivi actif : vérifier marge finale et traçabilité.' };
    }
    const risk = health.includes('malade') || health.includes('traitement') || (goal > 0 && progression < 70 && age > 30) ? 'high' : (goal > 0 && progression < 85) || cost.costPerKg > 0 && weight <= 0 ? 'medium' : 'low';
    const action = risk === 'high' ? 'Priorité santé/pesée : vérifier le sujet.' : risk === 'medium' ? 'Planifier une pesée ou ajuster l’alimentation.' : 'Suivi normal.';
    return { id: animal.id, label: labelOf(animal), group: animal.type || animal.espece || 'Animal', age, stage: animal.status || animal.statut || 'Actif', current: weight ? `${weight.toFixed(2)} kg` : 'Poids à saisir', target: goal ? `${goal.toFixed(2)} kg` : '—', progress: progression, metric: gmq ? `${gmq.toFixed(3)} kg/j` : 'GMQ à calculer', cost: cost.totalCost, unitCost: cost.costPerKg, risk, action };
  });
}

function cultureRows({ rows, businessEvents }) {
  return arr(rows).map((culture) => {
    const metrics = calculateCultureMetrics(culture);
    const age = daysBetween(culture.date_semis || culture.date_debut || culture.start_date);
    const qty = harvestQty(culture);
    const expected = toNumber(culture.quantite_prevue ?? culture.rendement_prevu ?? culture.production_prevue);
    const progression = expected > 0 && qty > 0 ? Math.min(120, (qty / expected) * 100) : toNumber(culture.progression ?? culture.avancement ?? 0);
    const area = surface(culture);
    const cost = toNumber(culture.cout_total_reel) || metrics.costTotal;
    const margin = toNumber(culture.marge_reelle) || metrics.marginEstimated;
    if (isTerminalStatus(culture)) {
      return { id: culture.id, label: labelOf(culture), group: culture.type || 'Culture', age, stage: terminalLabel(culture), current: qty ? `${fmtNumber(qty)} kg` : `${fmtNumber(area)} m²`, target: expected ? `${fmtNumber(expected)} kg` : '—', progress: progression, metric: 'Cycle terminé', cost, unitCost: qty ? cost / qty : 0, risk: 'closed', action: 'Culture sortie du suivi actif : vérifier récolte, pertes, marge et traçabilité.' };
    }
    const risk = margin < 0 || metrics.lossRate > 15 || metrics.healthScore < 60 ? 'high' : metrics.lossRate > 8 || metrics.healthScore < 80 ? 'medium' : 'low';
    const action = risk === 'high' ? 'Contrôler rendement, intrants et traitements.' : risk === 'medium' ? 'Suivre le stade et ajuster les intrants.' : 'Suivi normal.';
    return { id: culture.id, label: labelOf(culture), group: culture.type || 'Culture', age, stage: cultureStage(culture), current: qty ? `${fmtNumber(qty)} kg` : `${fmtNumber(area)} m²`, target: expected ? `${fmtNumber(expected)} kg` : '—', progress: progression, metric: `${fmtCurrency(area ? cost / area : 0)}/m²`, cost, unitCost: qty ? cost / qty : 0, risk, action };
  });
}

export default function GrowthPerformanceOverview({ mode = 'avicole', rows = [], alimentationLogs = [], productionLogs = [], vaccins = [], businessEvents = [] }) {
  const items = mode === 'animaux' ? animalRows({ rows, alimentationLogs, vaccins, businessEvents }) : mode === 'cultures' ? cultureRows({ rows, businessEvents }) : avicoleRows({ rows, alimentationLogs, productionLogs, businessEvents });
  const high = items.filter((item) => item.risk === 'high').length;
  const medium = items.filter((item) => item.risk === 'medium').length;
  const action = items.filter((item) => item.risk === 'action').length;
  const closed = items.filter((item) => item.risk === 'closed').length;
  const cost = items.reduce((sum, item) => sum + toNumber(item.cost), 0);
  const progressItems = items.filter((item) => !['closed', 'action'].includes(item.risk));
  const avgProgress = progressItems.length ? progressItems.reduce((sum, item) => sum + toNumber(item.progress), 0) / progressItems.length : 0;
  const title = mode === 'animaux' ? 'Croissance & performance animaux' : mode === 'cultures' ? 'Croissance & performance cultures' : 'Croissance & performance avicole';
  const subtitle = mode === 'cultures' ? 'Stades, rendement, coût et risque de marge.' : 'Poids, objectif, coût réel et risque de marge.';

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><BarChart3 size={20} /> {title}</p>
        <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p>
      </div>
      <div className={`rounded-2xl px-4 py-3 ${high ? 'bg-red-50 text-red-700' : action ? 'bg-purple-50 text-purple-700' : medium ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
        <p className="text-xs font-bold">Lecture rapide</p>
        <p className="text-sm font-black">{high ? `${high} priorité(s)` : action ? `${action} action(s) requise(s)` : medium ? `${medium} point(s) à surveiller` : 'Trajectoire maîtrisée'}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card icon={Scale} label="Sujets / cultures" value={fmtNumber(items.length)} hint={closed ? `${closed} cycle(s) terminé(s)` : ''} />
      <Card icon={TrendingUp} label="Progression moyenne" value={`${avgProgress.toFixed(1)}%`} hint="hors cycles terminés / à clôturer" danger={avgProgress > 0 && avgProgress < 75} />
      <Card icon={Leaf} label="Coût total suivi" value={fmtCurrency(cost)} />
      <Card icon={AlertTriangle} label="Risques / actions" value={`${high + medium + action}`} hint={`${high} élevé(s), ${medium} à surveiller, ${action} à clôturer`} danger={high + medium + action > 0} />
    </div>
    <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]">
      <table className="min-w-full text-sm">
        <thead><tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 px-3">Cible</th><th className="py-2 px-3">Groupe</th><th className="py-2 px-3">Âge</th><th className="py-2 px-3">Stade</th><th className="py-2 px-3">Actuel</th><th className="py-2 px-3">Objectif</th><th className="py-2 px-3">Indicateur</th><th className="py-2 px-3">Coût</th><th className="py-2 px-3">Risque</th></tr></thead>
        <tbody>{items.slice(0, 12).map((item) => <tr key={item.id} className="border-b border-[#f0e5d0]"><td className="py-3 px-3 font-bold text-[#2f2415]">{item.label}</td><td className="py-3 px-3">{item.group}</td><td className="py-3 px-3">{item.age} j</td><td className="py-3 px-3">{item.stage}</td><td className="py-3 px-3">{item.current}</td><td className="py-3 px-3">{item.target}</td><td className="py-3 px-3">{item.metric}</td><td className="py-3 px-3 font-bold">{fmtCurrency(item.cost)}</td><td className="py-3 px-3">{riskBadge(item.risk)}<p className="mt-1 text-xs text-[#8a7456]">{item.action}</p></td></tr>)}</tbody>
      </table>
    </div>
    {!items.length ? <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucune donnée de croissance disponible pour l’instant.</div> : null}
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5" /> Ce bloc rapproche croissance, objectifs et coûts. Les sujets à 0 actif sortent de la logique de surveillance et passent en action de clôture ou cycle terminé.</div>
  </section>;
}
