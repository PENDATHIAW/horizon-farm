import { AlertTriangle, ArrowRight, Bird, Building2, DollarSign, HeartPulse, Package, ShieldCheck, Stethoscope } from 'lucide-react';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').trim().toLowerCase();
const money = (value) => fmtCurrency(toNumber(value));
const amount = (row = {}) => toNumber(row.amount ?? row.montant ?? row.total ?? row.total_amount ?? row.cout_total ?? row.cout ?? row.frais_sante ?? row.cost ?? row.value);
const statusOf = (row = {}) => lower(row.status || row.statut || row.health_status || row.statut_sante || row.payment_status || row.statut_paiement);
const textOf = (row = {}) => lower(Object.values(row || {}).join(' '));
const hasTerm = (row = {}, terms = []) => terms.some((term) => textOf(row).includes(term));
const qty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.qty ?? row.stock);
const unit = (row = {}) => String(row.unite || row.unit || row.uom || '').trim();

function navigateTo(target, onNavigate) {
  if (!target) return;
  if (onNavigate) {
    onNavigate(target);
    return;
  }
  const normalized = String(target).replace('_', ' ').toLowerCase();
  const buttons = Array.from(document.querySelectorAll('nav button, aside button'));
  const match = buttons.find((button) => button.textContent?.toLowerCase().includes(normalized));
  if (match) match.click();
}

function MiniMetric({ icon: Icon, label, value, tone = 'good' }) {
  const toneClass = tone === 'danger' ? 'text-red-700 bg-red-50 border-red-200' : tone === 'amber' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <Icon size={15} />
      <p className="text-xl font-black mt-1">{value}</p>
      <p className="text-xs font-bold text-[#2f2415]">{label}</p>
    </div>
  );
}

function SignalCard({ icon: Icon, title, decision, module, metrics, onNavigate }) {
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Icon size={18} /></div>
          <div>
            <h4 className="font-black text-[#2f2415]">{title}</h4>
            <p className="text-xs text-[#7d6a4a] mt-1">{decision}</p>
          </div>
        </div>
        <button type="button" onClick={() => navigateTo(module, onNavigate)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-bold text-[#2f2415]">
          Ouvrir <ArrowRight size={12} className="inline" />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {metrics.map((metric) => <MiniMetric key={metric.label} {...metric} />)}
      </div>
    </div>
  );
}

export default function ImpactDomainDeepSignals(props) {
  const vets = arr(props.veterinaires || props.vets);
  const sante = arr(props.sante);
  const stocks = arr(props.stocks);
  const transactions = arr(props.transactions);
  const alimentationLogs = arr(props.alimentationLogs);
  const productionLogs = arr(props.productionLogs);
  const lots = arr(props.lots);
  const bpInvestmentLines = arr(props.bpInvestmentLines);
  const bpRecurringCosts = arr(props.bpRecurringCosts);
  const bpRevenueProjections = arr(props.bpRevenueProjections);
  const bpFundingSources = arr(props.bpFundingSources);
  const bpRisks = arr(props.bpRisks);
  const bpLinks = arr(props.bpLinks);

  const activeVets = vets.filter((row) => !['inactif', 'suspendu'].includes(statusOf(row))).length;
  const lateCare = sante.filter((row) => ['retard', 'en_retard', 'à_faire', 'a_faire'].includes(statusOf(row))).length;
  const preventiveCare = sante.filter((row) => hasTerm(row, ['vaccin', 'préventif', 'preventif', 'prophylaxie'])).length;
  const healthDocs = arr(props.documents).filter((row) => hasTerm(row, ['ordonnance', 'certificat', 'vaccin', 'vétérinaire', 'veterinaire', 'santé', 'sante'])).length;
  const healthStock = stocks.filter((row) => hasTerm(row, ['vaccin', 'médicament', 'medicament', 'traitement', 'désinfectant', 'desinfectant', 'veto', 'véto'])).length;
  const healthCost = transactions.filter((row) => hasTerm(row, ['sante', 'santé', 'veto', 'véto', 'vaccin', 'traitement'])).reduce((sum, row) => sum + amount(row), 0);

  const feedQty = alimentationLogs.reduce((sum, row) => sum + qty(row), 0);
  const feedUnits = [...new Set(alimentationLogs.map(unit).filter(Boolean))];
  const feedCost = alimentationLogs.reduce((sum, row) => sum + amount(row), 0);
  const eggs = productionLogs.reduce((sum, row) => sum + toNumber(row.oeufs_produits ?? row.eggs ?? row.quantity ?? row.quantite), 0);
  const losses = productionLogs.reduce((sum, row) => sum + toNumber(row.oeufs_casses ?? row.pertes ?? row.broken ?? row.casses), 0);
  const riskyLots = lots.filter((row) => toNumber(row.mortality || row.morts) > 0 || ['malade', 'critique', 'sous_traitement'].some((term) => statusOf(row).includes(term))).length;

  const bpInvestmentAmount = bpInvestmentLines.reduce((sum, row) => sum + amount(row), 0);
  const recurringAmount = bpRecurringCosts.reduce((sum, row) => sum + amount(row), 0);
  const projectedRevenue = bpRevenueProjections.reduce((sum, row) => sum + amount(row), 0);
  const fundingAmount = bpFundingSources.reduce((sum, row) => sum + amount(row), 0);
  const openRisks = bpRisks.filter((row) => !['clos', 'ferme', 'fermé', 'traite', 'traité'].includes(statusOf(row))).length;

  const signals = [
    {
      icon: HeartPulse,
      title: 'Santé enrichie',
      decision: 'Sécuriser les soins en retard, les preuves et les produits santé avant perte.',
      module: 'sante',
      metrics: [
        { icon: Stethoscope, label: 'Vétérinaires actifs', value: fmtNumber(activeVets), tone: activeVets ? 'good' : 'amber' },
        { icon: AlertTriangle, label: 'Soins en retard', value: fmtNumber(lateCare), tone: lateCare ? 'danger' : 'good' },
        { icon: ShieldCheck, label: 'Préventif / vaccins', value: fmtNumber(preventiveCare), tone: preventiveCare ? 'good' : 'amber' },
        { icon: DollarSign, label: 'Coût santé', value: money(healthCost), tone: healthCost ? 'good' : 'amber' },
      ],
    },
    {
      icon: Bird,
      title: 'Avicole & alimentation',
      decision: 'Comparer consommation, ponte et pertes avant de relancer ou agrandir un lot.',
      module: 'avicole',
      metrics: [
        { icon: Package, label: 'Consommation tracée', value: `${fmtNumber(feedQty)} ${feedUnits[0] || ''}`.trim(), tone: feedQty ? 'good' : 'amber' },
        { icon: DollarSign, label: 'Coût aliment', value: money(feedCost), tone: feedCost ? 'good' : 'amber' },
        { icon: ShieldCheck, label: 'Œufs produits', value: fmtNumber(eggs), tone: eggs ? 'good' : 'amber' },
        { icon: AlertTriangle, label: 'Pertes / lots risque', value: fmtNumber(losses + riskyLots), tone: losses + riskyLots ? 'amber' : 'good' },
      ],
    },
    {
      icon: Building2,
      title: 'Investissements & BP enrichis',
      decision: 'Comparer CAPEX, charges récurrentes, revenus projetés et financement avant décision.',
      module: 'investissements',
      metrics: [
        { icon: Building2, label: 'Lignes investissement', value: money(bpInvestmentAmount), tone: bpInvestmentAmount ? 'good' : 'amber' },
        { icon: DollarSign, label: 'Coûts récurrents', value: money(recurringAmount), tone: recurringAmount ? 'amber' : 'good' },
        { icon: ShieldCheck, label: 'Revenus projetés', value: money(projectedRevenue), tone: projectedRevenue ? 'good' : 'amber' },
        { icon: AlertTriangle, label: 'Risques BP ouverts', value: fmtNumber(openRisks), tone: openRisks ? 'amber' : 'good' },
      ],
    },
  ];

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456]">Signaux enrichis</p>
        <h3 className="font-black text-[#2f2415]">Données récemment reliées aux décisions</h3>
        <p className="text-sm text-[#7d6a4a] mt-1">Santé, alimentation avicole et business plan alimentent maintenant les arbitrages.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {signals.map((signal) => <SignalCard key={signal.title} {...signal} onNavigate={props.onNavigate} />)}
      </div>
      <div className="hidden">
        {healthDocs} {healthStock} {fundingAmount} {bpLinks.length}
      </div>
    </div>
  );
}
