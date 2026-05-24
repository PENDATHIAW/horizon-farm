import { Download, Eye, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useCrudModule from '../hooks/useCrudModule';
import { HORIZON_FARM_OFFICIAL_BP } from '../services/horizonFarmOfficialBusinessPlan';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (v) => Array.isArray(v) ? v : [];
const clean = (v = '') => String(v || '').replace(/\s{2,}/g, ' ').trim();
const today = () => new Date().toISOString().slice(0, 10);
const n = (v) => toNumber(v);
const money = (v = 0) => `${Math.round(n(v)).toLocaleString('fr-FR').replace(/\u202f/g, ' ')} FCFA`;
const amount = (row = {}) => n(row.total ?? row.montant ?? row.amount ?? row.cost ?? row.cout ?? (n(row.quantite) * n(row.prix_unitaire)));
const bpRows = (plan, rows = []) => plan?.id ? arr(rows).filter((row) => String(row.business_plan_id || '') === String(plan.id)) : arr(rows);

const FINANCEURS = {
  DER: { label: 'DER/FJ', angle: 'Emploi, entrepreneuriat, femmes/jeunes, formalisation et impact territorial', proof: 'Le dossier doit montrer les emplois créés, les ventes locales, la traçabilité, la sécurité alimentaire et la capacité de remboursement.' },
  FONGIP: { label: 'FONGIP', angle: 'Garantie, maîtrise du risque, suivi de gestion et capacité de remboursement', proof: 'Le dossier doit rassurer sur les risques, les garanties, les pièces justificatives, le reporting et les flux de trésorerie.' },
  BNDE: { label: 'BNDE / Banque', angle: 'Rentabilité, cash-flow, actifs financés, gouvernance et remboursement', proof: 'Le dossier doit mettre en avant les marges, le plan d’utilisation des fonds, les garanties possibles et le suivi financier.' },
  PARTENAIRE: { label: 'Partenaire privé', angle: 'Impact, croissance, exécution opérationnelle et opportunité commerciale', proof: 'Le dossier doit insister sur le marché, la différenciation, la capacité de vente et le potentiel de croissance.' },
  AUTRE: { label: 'Autre financeur', angle: 'Dossier adapté aux critères du partenaire choisi', proof: 'Le dossier doit mettre en avant la solidité du projet, le pilotage ERP, les preuves disponibles et la capacité de remboursement.' },
};
const financeurInfo = (key, custom = '') => key === 'AUTRE' && clean(custom) ? { ...FINANCEURS.AUTRE, label: clean(custom) } : (FINANCEURS[key] || FINANCEURS.DER);

function buildSummary({ data, plan, lines, costs, projections, fundings, risks, financeur, customFinanceur }) {
  const official = HORIZON_FARM_OFFICIAL_BP;
  const planLines = bpRows(plan, lines);
  const planCosts = bpRows(plan, costs);
  const planProjections = bpRows(plan, projections);
  const planFundings = bpRows(plan, fundings);
  const planRisks = bpRows(plan, risks);
  const investment = planLines.reduce((s, row) => s + amount(row), 0) || official.startupNeeds.officialTotal || 0;
  const annualRevenue = planProjections.reduce((s, row) => s + n(row.ca_estime ?? row.revenue ?? row.ca_prevu ?? row.montant), 0) || official.revenue.annualTotal || 0;
  const monthlyCosts = planCosts.reduce((s, row) => s + n(row.montant_mensuel ?? row.monthly_amount ?? row.montant ?? row.amount), 0) || Math.round((official.variableCosts.correctedAnnualTotal + official.fixedCosts.annualByYear[0] + official.payroll.annualTotal) / 12);
  const funding = planFundings.reduce((s, row) => s + n(row.montant ?? row.amount ?? row.value ?? row.valeur), 0);
  const sales = arr(data.salesOrders || data.sales_orders).reduce((s, row) => s + n(row.montant_total ?? row.total ?? row.amount), 0);
  const payments = arr(data.payments).reduce((s, row) => s + n(row.montant_paye ?? row.montant ?? row.amount), 0);
  return { financeur, customFinanceur, financeurLabel: financeurInfo(financeur, customFinanceur).label, planLines, planCosts, planProjections, planFundings, planRisks, investment, annualRevenue, monthlyCosts, funding, sales, payments, official, planName: plan?.nom || plan?.name || 'Business Plan Horizon Farm' };
}

function buildDraft(summary) {
  const f = financeurInfo(summary.financeur, summary.customFinanceur);
  const derBlock = summary.financeur === 'DER' ? '\n\nPoints DER/FJ à valoriser : emplois directs, emplois femmes/jeunes, formalisation, sécurité alimentaire, impact local, formation, suivi trimestriel, transparence des dépenses et capacité de remboursement.' : '';
  return {
    executive: `Horizon Farm est une ferme intégrée portée par Penda THIAW. Le projet combine production d’œufs, poulets de chair, embouche bovine, cultures et commercialisation structurée. Le financement demandé vise les actifs productifs, les infrastructures, les équipements, les intrants et le fonds de roulement. Le dossier est préparé pour ${f.label}. ${f.angle}.${derBlock}`,
    owner: 'Porteuse : Penda THIAW. Ajouter ici la mini-bio, le parcours, l’expérience terrain, le rôle dans le projet, les formations, le statut juridique et les éléments de légitimité pour le financeur.',
    request: `Montant structuré du BP : ${money(summary.investment)}. Nature du financement à préciser : prêt, subvention, garantie ou mixte. Durée, différé et plan de remboursement à adapter selon le financeur.`,
    market: 'Marché visé : ménages, revendeurs, restaurants, boutiques, marchés locaux, partenaires et clients réguliers. Ajouter les clients identifiés, lettres d’intention, commandes possibles et canaux de vente.',
    operations: 'Organisation opérationnelle : chair vendue autour de J+40, bovins vendus autour de J+90, pondeuses suivies selon taux de ponte réel. L’ERP suit ventes, stock, alimentation, santé, tâches, alertes, finances et justificatifs.',
    financials: `Prévisionnel : CA annuel BP ${money(summary.annualRevenue)}, charges mensuelles estimées ${money(summary.monthlyCosts)}, financement déjà identifié ${money(summary.funding)}. Pour un projet nouveau, présenter le prévisionnel, les hypothèses, le besoin en fonds de roulement et la capacité de remboursement plutôt que des états historiques inexistants.`,
    impact: 'Impact attendu : création d’emplois, revenus agricoles locaux, sécurité alimentaire, formalisation, achats auprès de fournisseurs locaux, formation des personnes impliquées, suivi transparent grâce à l’ERP.',
    risk: `${f.proof} Risques suivis : santé animale, rupture d’aliment, impayés clients, panne équipement, sous-chiffrage de devis. Réponses : biosécurité, seuils stock, relances, maintenance, devis et reporting.`,
    attachments: 'Pièces à joindre : devis/proformas, justificatif du site, pièce d’identité, documents administratifs, photos du site, captures ERP, prévisions financières, lettres de soutien, preuves de ventes ou clients si disponibles.',
  };
}
function investmentRows(s) {
  const rows = s.planLines.map((line) => [clean(line.designation || line.libelle || line.name || line.id), clean(line.categorie || line.category || 'Investissement'), `${line.quantite || ''} ${line.unite || ''}`.trim() || 'forfait', line.prix_unitaire ? money(line.prix_unitaire) : 'à valider par devis', amount(line) ? money(amount(line)) : 'à chiffrer par devis']);
  return rows.length ? rows : [['Pondeuses', 'Cheptel avicole', '3 000 sujets', 'selon devis', money(s.official?.layers?.startupCost || 0)], ['Poulets de chair', 'Cycle court', 'bandes de 500', 'selon devis', money(s.official?.broilers?.monthlyChickCost || 1024000)], ['Bovins', 'Embouche', '5 têtes/mois en roulement', 'selon devis', 'à chiffrer par devis'], ['Infrastructures', 'Poulailler, eau, clôture, stockage', 'forfaits', 'selon devis', 'à chiffrer par devis'], ['Fonds de roulement', 'Aliments, santé, salaires, transport', '3 à 6 mois', 'selon cycle', 'à chiffrer par devis']];
}
function section(doc, title, body, y) {
  if (y > 245) { doc.addPage(); y = 25; }
  doc.setFontSize(13); doc.setTextColor(47, 36, 21); doc.text(title, 14, y); y += 7;
  doc.setFontSize(9.5); const lines = doc.splitTextToSize(clean(body), 182); doc.text(lines, 14, y); return y + lines.length * 4.8 + 7;
}
function exportPdf(summary, draft) {
  const f = financeurInfo(summary.financeur, summary.customFinanceur);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(248, 245, 239); doc.rect(0, 0, 210, 297, 'F'); doc.setTextColor(47, 36, 21);
  doc.setFontSize(23); doc.text('DOSSIER DE DEMANDE', 16, 38); doc.text('DE FINANCEMENT', 16, 50); doc.setFontSize(28); doc.text('HORIZON FARM', 16, 74);
  doc.setFontSize(11); doc.text(`Financeur cible : ${f.label}`, 16, 92); doc.text(`Business Plan : ${summary.planName}`, 16, 100); doc.text(`Date : ${today()}`, 16, 108);
  autoTable(doc, { startY: 122, head: [['Indicateur', 'Valeur']], body: [['Investissement structuré', money(summary.investment)], ['CA annuel BP', money(summary.annualRevenue)], ['Charges mensuelles estimées', money(summary.monthlyCosts)], ['Ventes ERP saisies', money(summary.sales)], ['Encaissements ERP suivis', money(summary.payments)]], theme: 'grid', headStyles: { fillColor: [47, 36, 21], textColor: 255 }, styles: { fontSize: 8.5 } });
  doc.addPage(); let y = 24;
  y = section(doc, '1. Résumé exécutif', draft.executive, y);
  y = section(doc, '2. Porteuse du projet', draft.owner, y);
  y = section(doc, '3. Demande de financement', draft.request, y);
  y = section(doc, '4. Marché et débouchés', draft.market, y);
  y = section(doc, '5. Organisation opérationnelle', draft.operations, y);
  if (y > 210) { doc.addPage(); y = 24; }
  autoTable(doc, { startY: y, head: [['Poste', 'Catégorie', 'Quantité', 'Prix', 'Montant']], body: investmentRows(summary), theme: 'grid', headStyles: { fillColor: [47, 36, 21], textColor: 255 }, styles: { fontSize: 7.2, cellPadding: 2, overflow: 'linebreak' } });
  y = doc.lastAutoTable.finalY + 8;
  y = section(doc, '6. Prévisions financières', draft.financials, y);
  y = section(doc, '7. Impact et valeur ajoutée', draft.impact, y);
  y = section(doc, '8. Risques et réponses', draft.risk, y);
  y = section(doc, '9. Pièces à joindre', draft.attachments, y);
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(125, 106, 74); doc.text(`Horizon Farm · dossier financement · ${i}/${pages}`, 105, 288, { align: 'center' }); }
  doc.save(`dossier-financement-${f.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-horizon-farm-${today()}.pdf`);
}
function DraftModal({ draft, setDraft, onClose, onExport, saving }) {
  const labels = { executive: 'Résumé exécutif', owner: 'Porteuse du projet', request: 'Demande de financement', market: 'Marché et débouchés', operations: 'Organisation opérationnelle', financials: 'Prévisions financières', impact: 'Impact et valeur ajoutée', risk: 'Risques et réponses', attachments: 'Pièces à joindre' };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"><div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-3xl border border-[#eadcc2] bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#eadcc2] bg-white p-5"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Brouillon modifiable</p><h2 className="text-xl font-black text-[#2f2415]">Relire et adapter avant export PDF</h2><p className="text-sm text-[#8a7456]">Tu peux modifier chaque section avant de générer le dossier.</p></div><button type="button" onClick={onClose} aria-label="Fermer"><X size={20} /></button></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5">{Object.entries(labels).map(([key, label]) => <label key={key} className="space-y-1"><span className="text-xs font-black text-[#8a7456]">{label}</span><textarea rows={key === 'executive' ? 7 : 5} value={draft[key] || ''} onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))} className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm leading-relaxed" /></label>)}</div><div className="sticky bottom-0 flex justify-end gap-2 border-t border-[#eadcc2] bg-white p-4"><button type="button" onClick={onClose} className="rounded-xl border border-[#eadcc2] px-4 py-2 text-sm font-bold text-[#8a7456]">Annuler</button><button type="button" disabled={saving} onClick={onExport} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60"><Download size={15} className="inline" /> Exporter PDF</button></div></div></div>;
}

export default function FinancingDossierGenerator({ data = {}, onCreateDocument, onRefreshDocuments, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const businessPlans = useCrudModule('business_plans'); const investmentLines = useCrudModule('bp_investment_lines'); const recurringCosts = useCrudModule('bp_recurring_costs'); const revenueProjections = useCrudModule('bp_revenue_projections'); const fundingSources = useCrudModule('bp_funding_sources'); const risks = useCrudModule('bp_risks');
  const plans = arr(businessPlans.rows); const [planId, setPlanId] = useState(''); const [financeur, setFinanceur] = useState('DER'); const [customFinanceur, setCustomFinanceur] = useState(''); const [draft, setDraft] = useState(null); const [saving, setSaving] = useState(false);
  const selectedPlan = useMemo(() => plans.find((p) => String(p.id) === String(planId)) || plans.find((p) => String(p.nom || p.name || '').toLowerCase().includes('horizon farm')) || plans[0] || null, [plans, planId]);
  const summary = useMemo(() => buildSummary({ data, plan: selectedPlan, lines: investmentLines.rows, costs: recurringCosts.rows, projections: revenueProjections.rows, fundings: fundingSources.rows, risks: risks.rows, financeur, customFinanceur }), [data, selectedPlan, investmentLines.rows, recurringCosts.rows, revenueProjections.rows, fundingSources.rows, risks.rows, financeur, customFinanceur]);
  const f = financeurInfo(financeur, customFinanceur);
  const openDraft = () => { if (!selectedPlan && plans.length > 1) return toast.error('Choisis le Business Plan concerné.'); if (financeur === 'AUTRE' && !clean(customFinanceur)) return toast.error('Renseigne le nom du financeur.'); setDraft(buildDraft(summary)); };
  const exportDraft = async () => { try { setSaving(true); exportPdf(summary, draft); await onCreateDocument?.({ id: makeId('DOC'), title: `Dossier financement ${f.label}`, document_category: 'dossier_financement', module_source: 'rapports', entity_type: 'business_plan', entity_id: selectedPlan?.id || 'horizon_farm', status: 'genere', financeur: f.label, generated_at: new Date().toISOString() }); await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'dossier_financement_genere', module_source: 'rapports', entity_type: 'business_plan', entity_id: selectedPlan?.id || 'horizon_farm', title: `Dossier financement généré — ${f.label}`, severity: 'info', event_date: today() }); await Promise.allSettled([onRefreshDocuments?.(), onRefreshBusinessEvents?.()]); toast.success('Dossier de financement généré'); setDraft(null); } catch (error) { toast.error(error.message || 'Génération impossible'); } finally { setSaving(false); } };
  return <div className="space-y-4"><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="flex items-center gap-2 font-black text-[#2f2415]"><ShieldCheck size={18} /> Préparer un dossier banque / partenaire</p><p className="mt-1 text-sm text-[#8a7456]">Choisis le BP et le financeur, relis le brouillon, modifie les sections, puis exporte le PDF.</p></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="space-y-1"><span className="text-xs font-bold text-[#8a7456]">Business Plan</span><select value={planId || selectedPlan?.id || ''} onChange={(e) => setPlanId(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm">{plans.length ? plans.map((p) => <option key={p.id} value={p.id}>{p.nom || p.name || p.id}</option>) : <option value="">BP Horizon Farm officiel</option>}</select></label><label className="space-y-1"><span className="text-xs font-bold text-[#8a7456]">Financeur cible</span><select value={financeur} onChange={(e) => setFinanceur(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm">{Object.entries(FINANCEURS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>{financeur === 'AUTRE' ? <label className="space-y-1"><span className="text-xs font-bold text-[#8a7456]">Nom du financeur</span><input value={customFinanceur} onChange={(e) => setCustomFinanceur(e.target.value)} placeholder="Ex : banque, fonds, partenaire…" className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm" /></label> : <button type="button" onClick={openDraft} className="min-h-[44px] self-end rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white"><Eye size={15} className="inline" /> Prévisualiser</button>}</div>{financeur === 'AUTRE' ? <div className="flex justify-end"><button type="button" onClick={openDraft} className="min-h-[44px] rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white"><Eye size={15} className="inline" /> Prévisualiser</button></div> : null}<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"><Mini label="Investissement" value={fmtCurrency(summary.investment)} /><Mini label="CA annuel BP" value={fmtCurrency(summary.annualRevenue)} /><Mini label="Charges mensuelles" value={fmtCurrency(summary.monthlyCosts)} /><Mini label="Financeur" value={f.label} /></div>{draft ? <DraftModal draft={draft} setDraft={setDraft} onClose={() => setDraft(null)} onExport={exportDraft} saving={saving} /> : null}</div>;
}
function Mini({ label, value }) { return <div className="rounded-xl border border-[#eadcc2] bg-white p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] break-words">{value}</p></div>; }
