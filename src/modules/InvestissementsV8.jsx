import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Link2 } from 'lucide-react';
import CollapsibleAdvancedSection from '../components/CollapsibleAdvancedSection.jsx';
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
function linkPatch(module, id) { return { asset_module: module, asset_id: id, asset_created_at: new Date().toISOString(), source_module: 'investissements', source_record_id: id }; }

async function createOperationalAsset(line, props) {
  const type = assetType(line);
  const label = clean(line.designation);
  const qty = Math.max(1, Math.round(toNumber(line.quantite) || 1));
  const unitCost = toNumber(line.prix_unitaire);
  if (!type) return toast.error('Cette ligne ne correspond pas encore à un actif métier automatique.');
  if (line.asset_created_at || line.asset_id) return toast.error('Actif métier déjà créé pour cette ligne.');

  if (type === 'avicole') {
    const lotType = label.toLowerCase().includes('chair') || label.toLowerCase().includes('poulet') ? 'Chair' : 'Pondeuse';
    const id = makeId(lotType === 'Chair' ? 'LOTCH' : 'LOTP');
    await props.onCreateLot?.({ id, name: `${id} ${lotType}`, type: lotType, activity: lotType, status: 'actif', health_status: 'sain', initial_count: qty, current_count: qty, mortality: 0, malades: 0, entry_date: today(), date_entree: today(), date_debut: today(), age_days: 0, average_weight: 0, purchase_cost: unitCost * qty, source: 'business_plan', source_module: 'investissements', source_record_id: line.id, business_plan_id: line.business_plan_id, bp_line_id: line.id, linked_transaction_id: line.transaction_id || null, preuve_url: line.preuve_url || '' });
    await props.onUpdateBpInvestmentLine?.(line.id, linkPatch('avicole', id));
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
    await props.onUpdateBpInvestmentLine?.(line.id, linkPatch('animaux', createdIds.join(',')));
    await props.onRefreshAnimals?.();
  }

  if (type === 'culture') {
    const id = makeId('CULT');
    const isPoivron = label.toLowerCase().includes('poivron');
    await props.onCreateCulture?.({ id, nom: isPoivron ? 'Poivrons' : label || 'Culture BP', type: isPoivron ? 'Poivrons' : label || 'Culture', parcelle: 'À préciser', parcelle_code: 'À préciser', campagne: `BP ${line.business_plan_id || ''}`.trim(), statut: 'planifiee', date_debut_campagne: today(), date_semis: today(), surface: toNumber(line.quantite) || 0, surface_exploitable: toNumber(line.quantite) || 0, unite_surface: line.unite || 'ha', budget_prevu: toNumber(line.total), cout_total_reel: 0, revenu_reel: 0, source: 'business_plan', source_module: 'investissements', source_record_id: line.id, business_plan_id: line.business_plan_id, investment_id: line.id, bp_line_id: line.id, linked_transaction_id: line.transaction_id || null, preuve_url: line.preuve_url || '' });
    await props.onUpdateBpInvestmentLine?.(line.id, linkPatch('cultures', id));
    await props.onRefreshCultures?.();
  }
  await props.onRefreshBusinessPlans?.();
  toast.success('Actif métier créé et lié au BP');
}

function OperationalAssetsBridge(props) {
  const plan = (props.businessPlans || []).find((bp) => String(bp.nom || '').toLowerCase().includes('horizon farm')) || (props.businessPlans || [])[0];
  const lines = plan ? (props.bpInvestmentLines || []).filter((line) => line.business_plan_id === plan.id) : [];
  const eligible = lines.filter((line) => st(line) === 'effectif' && !line.asset_created_at && assetType(line));
  const linked = lines.filter((line) => line.asset_created_at || line.asset_id);
  if (!plan) return null;
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  return (
    <div className="space-y-6">
      <InvestissementsV7 {...props} />
      <CollapsibleAdvancedSection
        title="Investissements : contrôle, actifs métier et évolution"
        description="Les contrôles et l’automatisation BP restent disponibles ici, sans alourdir la lecture principale des projets."
        open={showAdvanced}
        onToggle={() => setShowAdvanced((value) => !value)}
      >
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
        <OperationalAssetsBridge {...props} />
        <InvestissementsEvolution {...props} />
      </CollapsibleAdvancedSection>
    </div>
  );
}
