import { AlertTriangle, Beef, Bird, DollarSign, HeartPulse, Package, Receipt, ShieldCheck, TrendingUp } from 'lucide-react';
import Sante from './Sante.jsx';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { calculateVaccineMetrics } from '../utils/businessCalculations';

const safeArray = (value) => Array.isArray(value) ? value : [];
const money = (value) => fmtCurrency(Number(value || 0));
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const todayIso = () => new Date().toISOString().slice(0, 10);

const animalHealthStatus = (animal = {}) => String(animal.health_status || animal.sante || animal.status_sante || '').toLowerCase();
const lotHealthStatus = (lot = {}) => String(lot.health_status || lot.sante || lot.status_sante || '').toLowerCase();
const isSickAnimal = (animal = {}) => ['malade', 'blesse', 'sous_traitement', 'a_surveiller', 'critique'].some((x) => animalHealthStatus(animal).includes(x));
const isSickLot = (lot = {}) => ['malade', 'sous_traitement', 'a_surveiller', 'critique'].some((x) => lotHealthStatus(lot).includes(x));
const lotDead = (lot = {}) => toNumber(lot.mortality ?? lot.morts ?? lot.dead_count ?? lot.pertes);
const lotSick = (lot = {}) => toNumber(lot.malades ?? lot.sick_count ?? lot.malade_count);
const amount = (row = {}) => toNumber(row.cout ?? row.amount ?? row.montant ?? row.total);
const isDone = (row = {}) => calculateVaccineMetrics(row).smartStatus === 'fait' || ['fait', 'realise', 'réalisé'].includes(String(row.statut || row.status || '').toLowerCase());

function ensureSanteImpactFields() {
  const fields = MODULE_FORM_FIELDS.sante || [];
  const add = (afterKey, items) => {
    const index = Math.max(0, fields.findIndex((field) => field.key === afterKey));
    items.forEach((item, offset) => {
      if (!fields.some((field) => field.key === item.key)) fields.splice(index + 1 + offset, 0, item);
    });
  };
  add('animal', [
    { key: 'module_lie', label: 'Module lie', type: 'select', options: ['animaux', 'avicole'] },
    { key: 'related_id', label: 'ID animal / lot', type: 'text' },
  ]);
  add('cout', [
    { key: 'medicament', label: 'Medicament / produit utilise', type: 'text' },
    { key: 'quantite_utilisee', label: 'Quantite utilisee', type: 'number' },
    { key: 'impact_business_note', label: 'Impact business / observation', type: 'text', fullWidth: true },
  ]);
}

function openModule(moduleKey) {
  if (!moduleKey || typeof document === 'undefined') return;
  const navButtons = Array.from(document.querySelectorAll('nav button'));
  navButtons.find((button) => button.textContent?.toLowerCase().includes(moduleKey.toLowerCase()))?.click();
}

function LinkCard({ icon: Icon, title, desc, moduleKey }) {
  return (
    <button type="button" onClick={() => openModule(moduleKey)} className="bg-white border border-[#d6c3a0] rounded-2xl p-4 text-left hover:border-[#b6975f] transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Icon size={18} /></div>
        <div><p className="font-black text-[#2f2415]">{title}</p><p className="text-xs text-[#8a7456] mt-1">{desc}</p></div>
      </div>
    </button>
  );
}

function ActionCard({ title, value, detail, danger, moduleKey }) {
  return (
    <button type="button" onClick={() => openModule(moduleKey)} className={`text-left border rounded-xl p-4 transition-all hover:border-[#b6975f] ${danger ? 'bg-red-50/70 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}>
      <p className="font-bold text-[#2f2415]">{title}</p>
      <p className="text-2xl font-black text-[#2f2415] mt-1">{value}</p>
      <p className="text-xs text-[#8a7456] mt-1">{detail}</p>
    </button>
  );
}

function HealthImpactSummary({ rows, animaux, lots, stocks, transactions }) {
  const vaccineRows = safeArray(rows);
  const animals = safeArray(animaux);
  const avicoleLots = safeArray(lots);
  const stockRows = safeArray(stocks);
  const txRows = safeArray(transactions);

  const lateVaccines = vaccineRows.filter((v) => calculateVaccineMetrics(v).smartStatus === 'retard');
  const plannedVaccines = vaccineRows.filter((v) => calculateVaccineMetrics(v).smartStatus === 'a_faire');
  const doneVaccines = vaccineRows.filter((v) => calculateVaccineMetrics(v).smartStatus === 'fait');
  const healthCosts = vaccineRows.reduce((sum, row) => sum + amount(row), 0) + txRows.filter((trx) => String(trx.categorie || trx.category || '').toLowerCase().includes('sante')).reduce((sum, trx) => sum + toNumber(trx.montant ?? trx.amount), 0);
  const sickAnimals = animals.filter(isSickAnimal);
  const sickLots = avicoleLots.filter((lot) => isSickLot(lot) || lotSick(lot) > 0 || lotDead(lot) > 0);
  const avicoleDeaths = avicoleLots.reduce((sum, lot) => sum + lotDead(lot), 0);
  const medicinesLow = stockRows.filter((item) => {
    const name = String(item.nom || item.name || item.categorie || item.category || '').toLowerCase();
    const isHealthStock = ['vaccin', 'medicament', 'médicament', 'sante', 'santé', 'veto', 'vétérinaire'].some((x) => name.includes(x));
    return isHealthStock && toNumber(item.quantite ?? item.quantity) <= toNumber(item.seuil ?? item.threshold);
  });
  const coverage = vaccineRows.length ? (doneVaccines.length / vaccineRows.length) * 100 : 0;
  const riskScore = Math.min(100, lateVaccines.length * 15 + sickAnimals.length * 10 + sickLots.length * 8 + medicinesLow.length * 8 + avicoleDeaths * 2);

  const priorityActions = [
    lateVaccines.length ? { title: 'Vaccins en retard', value: lateVaccines.length, detail: 'À traiter avant aggravation sanitaire.', moduleKey: 'Sante', danger: true } : null,
    sickAnimals.length ? { title: 'Animaux malades', value: sickAnimals.length, detail: 'Ouvrir Animaux pour vérifier les fiches.', moduleKey: 'Animaux', danger: true } : null,
    sickLots.length ? { title: 'Lots avicoles à risque', value: sickLots.length, detail: 'Morts, malades ou lots sous surveillance.', moduleKey: 'Avicole', danger: true } : null,
    medicinesLow.length ? { title: 'Stock santé critique', value: medicinesLow.length, detail: 'Vaccins/médicaments sous seuil.', moduleKey: 'Stock', danger: true } : null,
    healthCosts > 0 ? { title: 'Coût santé suivi', value: money(healthCosts), detail: 'Alimente Impact Business.', moduleKey: 'Impact Business', danger: false } : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <SectionHeader title="Pilotage santé connecté" sub="La santé doit alimenter Animaux, Avicole, Stock, Finances, Alertes et Impact Business." />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <LinkCard icon={Beef} title="Animaux" desc="Statuts malade, soins et historique individuel" moduleKey="Animaux" />
        <LinkCard icon={Bird} title="Avicole" desc="Morts, malades, vaccins et lots à surveiller" moduleKey="Avicole" />
        <LinkCard icon={Package} title="Stock santé" desc="Vaccins, médicaments, ruptures et seuils" moduleKey="Stock" />
        <LinkCard icon={DollarSign} title="Finances" desc="Frais vétérinaires et coûts de traitement" moduleKey="Finances" />
        <LinkCard icon={TrendingUp} title="Impact Business" desc="Pertes évitées, coût santé et risque business" moduleKey="Impact Business" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={ShieldCheck} label="Couverture vaccinale" value={pct(coverage)} sub={`${fmtNumber(doneVaccines.length)} faits / ${fmtNumber(vaccineRows.length)}`} color="bg-emerald-500/20 text-emerald-500" />
        <KpiCard icon={AlertTriangle} label="Retards" value={fmtNumber(lateVaccines.length)} color="bg-red-500/20 text-red-500" />
        <KpiCard icon={HeartPulse} label="Animaux malades" value={fmtNumber(sickAnimals.length)} color="bg-red-500/20 text-red-500" />
        <KpiCard icon={Bird} label="Lots avicoles à risque" value={fmtNumber(sickLots.length)} sub={`${fmtNumber(avicoleDeaths)} morts`} color="bg-amber-500/20 text-amber-500" />
        <KpiCard icon={Receipt} label="Coût santé" value={money(healthCosts)} color="bg-sky-500/20 text-sky-500" />
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-amber-600" />
          <h3 className="font-black text-[#2f2415]">Priorités santé & impact business</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {priorityActions.length ? priorityActions.map((item) => <ActionCard key={item.title} {...item} />) : (
            <div className="md:col-span-2 xl:col-span-3 bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4 text-sm text-[#8a7456]">Aucune urgence santé détectée. Les prochaines améliorations santé alimenteront automatiquement Impact Business.</div>
          )}
        </div>
        <div className="mt-4 bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4 text-sm text-[#7d6a4a]">
          <b className="text-[#2f2415]">Risque business santé : {Math.round(riskScore)}%</b>
          <p className="mt-1">Calcul temporaire basé sur vaccins en retard, animaux/lots malades, morts avicoles et stocks santé critiques. Il sera affiné après les modules Stock, Finances et Ventes.</p>
        </div>
      </div>
    </div>
  );
}

export default function SanteV2(props) {
  ensureSanteImpactFields();

  const createFinanceIfNeeded = async (payload) => {
    const cost = amount(payload);
    if (!props.onCreateFinanceTransaction || cost <= 0 || !isDone(payload)) return;
    await props.onCreateFinanceTransaction({
      id: `TRX-SANTE-${Date.now()}`,
      type: 'sortie',
      libelle: `Sante - ${payload.nom || 'Intervention'}`,
      montant: cost,
      date: payload.effectuee || todayIso(),
      categorie: 'Sante',
      module_lie: payload.module_lie || 'sante',
      related_id: payload.related_id || payload.animal || payload.id,
      statut: 'paye',
    });
  };

  const wrappedProps = {
    ...props,
    onCreate: async (payload) => {
      const result = await props.onCreate?.(payload);
      await createFinanceIfNeeded(payload);
      await Promise.allSettled([props.onRefresh?.(), props.onRefreshFinances?.()]);
      return result;
    },
    onUpdate: async (id, payload) => {
      const result = await props.onUpdate?.(id, payload);
      await createFinanceIfNeeded({ ...payload, id });
      await Promise.allSettled([props.onRefresh?.(), props.onRefreshFinances?.()]);
      return result;
    },
    onDelete: async (id) => {
      const result = await props.onDelete?.(id);
      await props.onRefresh?.();
      return result;
    },
    onCreateVet: async (payload) => {
      const result = await props.onCreateVet?.(payload);
      await props.onRefreshVets?.();
      return result;
    },
    onUpdateVet: async (id, payload) => {
      const result = await props.onUpdateVet?.(id, payload);
      await props.onRefreshVets?.();
      return result;
    },
    onDeleteVet: async (id) => {
      const result = await props.onDeleteVet?.(id);
      await props.onRefreshVets?.();
      return result;
    },
  };

  return (
    <div className="space-y-6">
      <HealthImpactSummary rows={props.rows} animaux={props.animaux} lots={props.lots} stocks={props.stocks} transactions={props.transactions} />
      <Sante {...wrappedProps} />
    </div>
  );
}
