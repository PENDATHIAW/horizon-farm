import { CheckCircle2, FileText, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import FinanceAccountingHealth from './FinanceAccountingHealth.jsx';
import FinancingFinancialStatementGuide from './FinancingFinancialStatementGuide.jsx';
import Rapports from './Rapports.jsx';
import { makeId } from '../utils/ids';

const today = () => new Date().toISOString().slice(0, 10);
const lower = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const FINANCIERS = ['DER', 'FONGIP', 'BNDE', 'Banque', 'Partenaire', 'Investisseur'];
const inferFinancier = (draft = {}) => {
  const text = lower(`${draft.raw_input || ''} ${draft.draft_fields?.financier || ''}`);
  if (text.includes('fongip')) return 'FONGIP';
  if (text.includes('bnde')) return 'BNDE';
  if (text.includes('der')) return 'DER';
  if (text.includes('banque')) return 'Banque';
  if (text.includes('investisseur')) return 'Investisseur';
  return 'Partenaire';
};
const bpLabel = (bp = {}) => bp.name || bp.nom || bp.title || bp.titre || bp.id || 'Business Plan';
const fmt = (value = 0) => Number(value || 0).toLocaleString('fr-FR');

function HorizonFinancingFileCard({ draft, data, onCreateDocument, onRefreshDocuments, onCreateBusinessEvent, onRefreshBusinessEvents, onClose }) {
  const businessPlans = data.businessPlans || data.business_plans || [];
  const [financier, setFinancier] = useState(inferFinancier(draft));
  const [bpId, setBpId] = useState(draft?.draft_fields?.business_plan_id || businessPlans[0]?.id || '');
  const [amount, setAmount] = useState(draft?.draft_fields?.amount || '');
  const [purpose, setPurpose] = useState(draft?.draft_fields?.purpose || 'Financement Horizon Farm : production avicole, bovine et croissance ferme');
  const [includeRisk, setIncludeRisk] = useState(true);
  const [includeCashflow, setIncludeCashflow] = useState(true);
  const [includeImpact, setIncludeImpact] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [saving, setSaving] = useState(false);
  const selectedBp = businessPlans.find((bp) => String(bp.id) === String(bpId)) || businessPlans[0] || null;
  const totals = useMemo(() => {
    const transactions = data.transactions || data.finances || [];
    const salesOrders = data.salesOrders || data.sales_orders || [];
    const payments = data.payments || [];
    return {
      revenue: payments.reduce((sum, p) => sum + Number(p.montant || p.amount || p.montant_paye || 0), 0) || salesOrders.reduce((sum, s) => sum + Number(s.montant_total || s.total || 0), 0),
      expenses: transactions.filter((t) => ['sortie', 'depense', 'dépense'].includes(lower(t.type || t.transaction_type))).reduce((sum, t) => sum + Number(t.montant || t.amount || 0), 0),
      animals: (data.animaux || []).length,
      lots: (data.lots || data.avicole || []).length,
      docs: (data.documents || []).length,
    };
  }, [data]);
  const sections = [
    'Résumé exécutif du projet',
    `Financeur cible : ${financier}`,
    selectedBp ? `Business Plan retenu : ${bpLabel(selectedBp)}` : 'Business Plan à sélectionner',
    amount ? `Montant sollicité : ${fmt(amount)} FCFA` : 'Montant sollicité à compléter',
    `Objet : ${purpose}`,
    `Traction ERP : revenus suivis ${fmt(totals.revenue)} FCFA, charges suivies ${fmt(totals.expenses)} FCFA`,
    `Actifs opérationnels : ${totals.animals} animaux, ${totals.lots} lots avicoles, ${totals.docs} documents/preuves`,
    includeCashflow ? 'Plan de trésorerie : encaissements, dépenses, reste à payer, paiements clients' : '',
    includeRisk ? 'Analyse risques : mortalité, santé, stock, marché, trésorerie, mitigations' : '',
    includeImpact ? 'Impact : emplois, sécurité alimentaire, traçabilité, production locale' : '',
    includeEvidence ? 'Annexes : factures, preuves, ventes, stocks, photos/documents disponibles' : '',
  ].filter(Boolean);
  const submit = async () => {
    try {
      setSaving(true);
      const id = makeId('DOC');
      await onCreateDocument?.({
        id,
        title: `Dossier ${financier} - Horizon Farm`,
        nom: `Dossier ${financier} - Horizon Farm`,
        type: 'dossier_financement',
        categorie: 'banque_partenaire',
        financeur: financier,
        business_plan_id: selectedBp?.id || bpId || '',
        amount_requested: Number(amount || 0),
        montant_sollicite: Number(amount || 0),
        status: 'pret_a_completer',
        statut: 'pret_a_completer',
        date: today(),
        sections,
        contenu: sections.join('\n\n'),
        source_module: 'hey_horizon',
        notes: draft?.raw_input || '',
      });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'dossier_financeur_prepare', module_source: 'rapports', entity_type: 'document', entity_id: id, title: `Dossier financeur préparé · ${financier}`, description: sections.join('\n'), event_date: today(), severity: 'info', amount: Number(amount || 0), saisies_evitees: 6 });
      await Promise.allSettled([onRefreshDocuments?.(), onRefreshBusinessEvents?.()]);
      exportFinanceurReportPdf(data, {
        financier,
        businessPlanLabel: selectedBp ? bpLabel(selectedBp) : 'Business Plan Horizon Farm',
        amountRequested: Number(amount || 0),
        purpose,
      });
      toast.success(`Dossier ${financier} préparé et PDF téléchargé`);
      onClose?.();
    } catch (error) { toast.error(error.message || 'Création dossier financeur impossible'); } finally { setSaving(false); }
  };
  return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-4">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-emerald-700 font-black flex items-center gap-2"><FileText size={15} /> Fiche préparée par Hey Horizon</p><h3 className="mt-1 text-xl font-black text-[#2f2415]">Dossier Banque / Partenaire</h3><p className="mt-1 text-sm text-emerald-800">Choisis le financeur et le BP. Le dossier est enrichi avec les données ERP disponibles.</p></div><button type="button" onClick={onClose} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><X size={16} /></button></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Financeur</span><select value={financier} onChange={(e) => setFinancier(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm">{FINANCIERS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Business Plan</span><select value={bpId} onChange={(e) => setBpId(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="">Aucun / dossier général</option>{businessPlans.map((bp) => <option key={bp.id} value={bp.id}>{bpLabel(bp)}</option>)}</select></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Montant sollicité</span><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1 md:col-span-3"><span className="text-xs font-bold text-emerald-800">Objet du financement</span><input value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm text-emerald-900"><label className="rounded-xl bg-white border border-emerald-200 p-3"><input type="checkbox" checked={includeCashflow} onChange={(e) => setIncludeCashflow(e.target.checked)} /> Trésorerie</label><label className="rounded-xl bg-white border border-emerald-200 p-3"><input type="checkbox" checked={includeRisk} onChange={(e) => setIncludeRisk(e.target.checked)} /> Risques</label><label className="rounded-xl bg-white border border-emerald-200 p-3"><input type="checkbox" checked={includeImpact} onChange={(e) => setIncludeImpact(e.target.checked)} /> Impact</label><label className="rounded-xl bg-white border border-emerald-200 p-3"><input type="checkbox" checked={includeEvidence} onChange={(e) => setIncludeEvidence(e.target.checked)} /> Preuves</label></div>
    <div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-800"><CheckCircle2 size={14} className="inline" /> Le document créé servira de base au PDF financeur : résumé, chiffres ERP, risques, impact et annexes.</div>
    <div className="flex justify-end"><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Préparation...' : 'Préparer le dossier'}</button></div>
  </section>;
}

export default function RapportsV2(props) {
  const [horizonDraft, setHorizonDraft] = useState(null);
  const data = props.data || {};
  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      if (event.detail?.module === 'rapports' && draft?.form_type === 'financing_file') {
        setHorizonDraft(draft);
        window.setTimeout(() => document.getElementById('hey-horizon-financing-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, []);
  return <div className="space-y-6">
    {horizonDraft ? <div id="hey-horizon-financing-card"><HorizonFinancingFileCard draft={horizonDraft} data={data} onCreateDocument={props.onCreateDocument} onRefreshDocuments={props.onRefreshDocuments} onCreateBusinessEvent={props.onCreateBusinessEvent} onRefreshBusinessEvents={props.onRefreshBusinessEvents} onClose={() => setHorizonDraft(null)} /></div> : null}
    <FinanceAccountingHealth
      transactions={data.transactions || data.finances || []}
      salesOrders={data.salesOrders || data.sales_orders || []}
      payments={data.payments || []}
      documents={data.documents || []}
      clients={data.clients || []}
      fournisseurs={data.fournisseurs || []}
      onNavigate={props.onNavigate}
    />
    <FinancingFinancialStatementGuide data={data} onNavigate={props.onNavigate} />
    <Rapports {...props} />
  </div>;
}