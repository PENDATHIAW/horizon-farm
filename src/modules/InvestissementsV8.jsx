import { Component, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, BarChart3, CheckCircle2, ChevronDown, Link2, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react';
import { toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import InvestissementsV7 from './InvestissementsV7.jsx';
import InvestissementsEvolution from './InvestissementsEvolution.jsx';
import InvestmentQualityControl from './InvestmentQualityControl.jsx';

const clean = (v = '') => String(v)
  .replace(/\s+\d+\s*(mois|semaines?|jours?)\b/gi, '')
  .replace(/\s+\d+\s*-\s*\d+\s*semaines?/gi, '')
  .replace(/\s+à\s+[\d\s.,]+\s*(f|fcfa)\b/gi, '')
  .replace(/\s{2,}/g, ' ')
  .trim();
const st = (r = {}) => String(r.statut ?? r.status ?? '').toLowerCase();

function today() { return new Date().toISOString().slice(0, 10); }
function isAvicole(line = {}) { const d = clean(line.designation).toLowerCase(); return d.includes('poussin') || d.includes('poulet') || d.includes('pondeuse') || d.includes('chair'); }
function isAnimal(line = {}) { const d = clean(line.designation).toLowerCase(); return d.includes('bovin') || d.includes('bœuf') || d.includes('boeuf') || d.includes('mouton') || d.includes('chèvre') || d.includes('chevre'); }
function isCulture(line = {}) { const d = clean(line.designation).toLowerCase(); return d.includes('culture') || d.includes('poivron') || d.includes('maraichage') || d.includes('maraîchage') || d.includes('champ') || d.includes('irrigation'); }
function assetType(line = {}) { if (isAvicole(line)) return 'avicole'; if (isAnimal(line)) return 'animal'; if (isCulture(line)) return 'culture'; return ''; }
function linkPatch(line = {}, module, id) { return { asset_module: module, asset_id: id, asset_created_at: new Date().toISOString(), asset_status: 'cree', statut: 'lie_metier', status: 'lie_metier', executed_at: new Date().toISOString(), source_module: 'investissements', source_record_id: line.id }; }

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}
function CollapsibleSection({ icon: Icon, title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white shadow-sm overflow-hidden"><button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-[64px] w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#fffdf8]"><span><span className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</span>{subtitle ? <span className="mt-1 block text-sm text-[#8a7456]">{subtitle}</span> : null}</span><ChevronDown size={20} className={`shrink-0 text-[#8a7456] transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-[#eadcc2] p-5">{children}</div> : null}</section>;
}
function BlockFallback({ title, message, onRetry }) {
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="flex items-center gap-2 font-black"><AlertTriangle size={17} /> Bloc indisponible</p><p className="mt-1 text-sm">La section <b>{title}</b> n’a pas pu être chargée. Le reste du module Investissements reste utilisable.</p>{message ? <p className="mt-2 rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-xs">Détail : {message}</p> : null}</div><button type="button" onClick={onRetry} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-black text-amber-800 hover:bg-amber-100"><RefreshCw size={15} /> Réessayer</button></div></div>;
}
class SafeBlock extends Component {
  constructor(props) { super(props); this.state = { hasError: false, message: '' }; }
  static getDerivedStateFromError(error) { return { hasError: true, message: error?.message || '' }; }
  componentDidCatch(error) { console.warn(`Bloc investissements indisponible: ${this.props.title}`, error?.message || error); }
  retry = () => this.setState({ hasError: false, message: '' });
  render() { if (this.state.hasError) return <BlockFallback title={this.props.title} message={this.state.message} onRetry={this.retry} />; return this.props.children; }
}

async function createOperationalAsset(line, props) {
  const type = assetType(line);
  const label = clean(line.designation);
  const qty = Math.max(1, Math.round(toNumber(line.quantite) || 1));
  const unitCost = toNumber(line.prix_unitaire);
  if (!type) return toast.error('Cette ligne ne correspond pas encore à un actif métier automatique.');
  if (line.asset_created_at || line.asset_id) return toast.error('Actif métier déjà créé pour cette ligne.');
  if (!props.onUpdateBpInvestmentLine) return toast.error('Lien BP indisponible : impossible de verrouiller cette ligne.');

  if (type === 'avicole') {
    const lotType = label.toLowerCase().includes('chair') || label.toLowerCase().includes('poulet') ? 'Chair' : 'Pondeuse';
    const id = makeId(lotType === 'Chair' ? 'LOTCH' : 'LOTP');
    await props.onCreateLot?.({ id, name: `${id} ${lotType}`, type: lotType, activity: lotType, status: 'actif', health_status: 'sain', initial_count: qty, current_count: qty, mortality: 0, malades: 0, entry_date: today(), date_entree: today(), date_debut: today(), age_days: 0, average_weight: 0, purchase_cost: unitCost * qty, source: 'business_plan', source_module: 'investissements', source_record_id: line.id, business_plan_id: line.business_plan_id, bp_line_id: line.id, linked_transaction_id: line.transaction_id || null, preuve_url: line.preuve_url || '' });
    await props.onUpdateBpInvestmentLine?.(line.id, linkPatch(line, 'avicole', id));
    await props.onRefreshLots?.();
  }

  if (type === 'animal') {
    const lower = label.toLowerCase();
    const animalType = lower.includes('mouton') ? 'Ovin' : lower.includes('chèvre') || lower.includes('chevre') ? 'Caprin' : 'Bovin';
    const prefix = animalType === 'Bovin' ? 'BOV' : animalType === 'Ovin' ? 'OVI' : 'CAP';
    const createdIds = [];
    for (let i = 0; i < qty; i += 1) {
      const id = makeId(prefix);
      createdIds.push(id);
      await props.onCreateAnimal?.({ id, tag: id, name: `${animalType} BP ${i + 1}`, type: animalType, status: 'actif', health_status: 'sain', mode_acquisition: 'achat', date_achat: today(), date_entree_ferme: today(), purchase_cost: unitCost, source: 'business_plan', source_module: 'investissements', source_record_id: line.id, business_plan_id: line.business_plan_id, bp_line_id: line.id, linked_transaction_id: line.transaction_id || null, preuve_url: line.preuve_url || '' });
    }
    await props.onUpdateBpInvestmentLine?.(line.id, linkPatch(line, 'animaux', createdIds.join(',')));
    await props.onRefreshAnimals?.();
  }

  if (type === 'culture') {
    const id = makeId('CULT');
    const isPoivron = label.toLowerCase().includes('poivron');
    await props.onCreateCulture?.({ id, nom: isPoivron ? 'Poivrons' : label || 'Culture BP', type: isPoivron ? 'Poivrons' : label || 'Culture', parcelle: 'À préciser', parcelle_code: 'À préciser', campagne: `BP ${line.business_plan_id || ''}`.trim(), statut: 'planifiee', date_debut_campagne: today(), date_semis: today(), surface: toNumber(line.quantite) || 0, surface_exploitable: toNumber(line.quantite) || 0, unite_surface: line.unite || 'ha', budget_prevu: toNumber(line.total), cout_total_reel: 0, revenu_reel: 0, source: 'business_plan', source_module: 'investissements', source_record_id: line.id, business_plan_id: line.business_plan_id, investment_id: line.id, bp_line_id: line.id, linked_transaction_id: line.transaction_id || null, preuve_url: line.preuve_url || '' });
    await props.onUpdateBpInvestmentLine?.(line.id, linkPatch(line, 'cultures', id));
    await props.onRefreshCultures?.();
  }
  await props.onRefreshBpInvestmentLines?.();
  await props.onRefreshBusinessPlans?.();
  toast.success('Actif métier créé et ligne BP verrouillée');
}

function OperationalAssetsBridge(props) {
  const plan = (props.businessPlans || []).find((bp) => String(bp.nom || '').toLowerCase().includes('horizon farm')) || (props.businessPlans || [])[0];
  const lines = plan ? (props.bpInvestmentLines || []).filter((line) => line.business_plan_id === plan.id) : [];
  const eligible = lines.filter((line) => st(line) === 'effectif' && !line.asset_created_at && !line.asset_id && assetType(line));
  const linked = lines.filter((line) => line.asset_created_at || line.asset_id);
  if (!plan) return <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]">Aucun business plan actif pour le moment.</div>;
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Actifs métier liés</p><h3 className="font-black text-[#2f2415]">Transformer les dépenses effectives en lots, animaux ou cultures</h3><p className="text-sm text-[#8a7456] mt-1">Après paiement, crée l’actif opérationnel pour que Avicole, Animaux ou Cultures se mette à jour.</p></div>
        <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 text-sm"><b>{linked.length}</b> ligne(s) déjà liée(s)</div>
      </div>
      {eligible.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{eligible.map((line) => <button type="button" key={line.id} onClick={() => createOperationalAsset(line, props)} className="text-left rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 hover:border-[#b6975f]"><p className="font-bold text-[#2f2415]"><Link2 size={14} className="inline" /> {clean(line.designation)}</p><p className="text-xs text-[#8a7456] mt-1">Créer dans {assetType(line) === 'animal' ? 'Animaux' : assetType(line) === 'avicole' ? 'Avicole' : 'Cultures'} · quantité {line.quantite}</p></button>)}</div> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucune ligne effective en attente de création métier.</div>}
    </div>
  );
}

export default function InvestissementsV8(props) {
  return (
    <div className="space-y-6 investissements-mobile-structured">
      <style>{`@media (max-width: 640px){.investissements-mobile-structured .rounded-2xl{border-radius:18px}.investissements-mobile-structured table{font-size:12px}.investissements-mobile-structured th,.investissements-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.investissements-mobile-structured .text-2xl{font-size:1.35rem}.investissements-mobile-structured .grid{gap:.75rem}.investissements-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

      <ModuleSection icon={ShieldCheck} title="Contrôle qualité investissement" subtitle="Cohérence BP, financements, lignes effectives, liens métiers et risques à traiter avant les détails.">
        <SafeBlock title="Contrôle qualité investissement">
          <InvestmentQualityControl
            rows={props.rows || []}
            businessPlans={props.businessPlans || []}
            bpInvestmentLines={props.bpInvestmentLines || []}
            bpFundingSources={props.bpFundingSources || []}
            transactions={props.transactions || []}
            lots={props.lots || []}
            animaux={props.animaux || []}
            cultures={props.cultures || []}
          />
        </SafeBlock>
      </ModuleSection>

      <ModuleSection icon={Link2} title="Actifs métier créés depuis BP" subtitle="Transformation des dépenses effectives en lots avicoles, animaux ou cultures exploitables.">
        <SafeBlock title="Actifs métier créés depuis BP"><OperationalAssetsBridge {...props} /></SafeBlock>
      </ModuleSection>

      <CollapsibleSection icon={TrendingUp} title="Portefeuille investissements & business plans" subtitle="Projets, lignes BP, financement, paiements et suivi détaillé des investissements." defaultOpen={false}>
        <SafeBlock title="Portefeuille investissements & business plans"><InvestissementsV7 {...props} /></SafeBlock>
      </CollapsibleSection>

      <CollapsibleSection icon={BarChart3} title="Évolution investissements" subtitle="Graphes des investissements, financements, CAPEX, risques et valeur créée." defaultOpen={false}>
        <SafeBlock title="Évolution investissements"><InvestissementsEvolution {...props} /></SafeBlock>
      </CollapsibleSection>
    </div>
  );
}
