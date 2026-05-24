import { Download, FileText, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useCrudModule from '../hooks/useCrudModule';
import { HORIZON_FARM_OFFICIAL_BP } from '../services/horizonFarmOfficialBusinessPlan';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (v) => Array.isArray(v) ? v : [];
const today = () => new Date().toISOString().slice(0, 10);
const clean = (v = '') => String(v || '').replace(/\s{2,}/g, ' ').trim();
const n = (v) => toNumber(v);
const amount = (row = {}) => n(row.total ?? row.montant ?? row.amount ?? row.cost ?? row.cout ?? (n(row.quantite) * n(row.prix_unitaire)));
const bpRows = (plan, rows = []) => plan?.id ? arr(rows).filter((row) => String(row.business_plan_id || '') === String(plan.id)) : arr(rows);

const FINANCEURS = {
  DER: { label: 'DER/FJ', angle: 'Entrepreneuriat, emploi des jeunes/femmes, formalisation et impact territorial', proof: 'Mettre en avant emplois, ventes locales, traçabilité, capacité de remboursement et impact social.' },
  FONGIP: { label: 'FONGIP', angle: 'Garantie, maîtrise du risque, suivi de gestion et capacité de remboursement', proof: 'Insister sur ERP, reporting, risques maîtrisés, pièces justificatives et flux de trésorerie.' },
  BNDE: { label: 'BNDE / Banque', angle: 'Rentabilité, cash-flow, garanties, gouvernance et remboursement', proof: 'Mettre en avant prévisions, marges, actifs financés, plan d’utilisation des fonds et reporting.' },
  PARTENAIRE: { label: 'Partenaire privé', angle: 'Impact, croissance, exécution opérationnelle et opportunité commerciale', proof: 'Mettre en avant marché, différenciation, capacité de vente, suivi ERP et potentiel de croissance.' },
};

function table(doc, y, head, body, options = {}) {
  autoTable(doc, { startY: y, head: [head], body, theme: 'grid', headStyles: { fillColor: [47, 36, 21], textColor: 255, fontSize: 8 }, styles: { fontSize: options.fontSize || 8, cellPadding: 2.2, overflow: 'linebreak', valign: 'top' }, alternateRowStyles: { fillColor: [252, 249, 242] }, margin: { left: 14, right: 14 }, ...options });
  return doc.lastAutoTable.finalY + 8;
}
function title(doc, text, y = 28) { doc.setFontSize(15); doc.setTextColor(47, 36, 21); doc.text(text, 14, y); doc.setDrawColor(201, 169, 106); doc.line(14, y + 3, 196, y + 3); doc.setFontSize(10); return y + 12; }
function para(doc, text, x, y, w = 182) { const lines = doc.splitTextToSize(text, w); doc.text(lines, x, y); return y + lines.length * 5.2 + 4; }
function page(doc, name) { doc.addPage(); doc.setFillColor(47, 36, 21); doc.rect(0, 0, 210, 17, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.text('HORIZON FARM', 12, 11); doc.text(name, 198, 11, { align: 'right' }); doc.setTextColor(47, 36, 21); }
function footer(doc) { const pages = doc.internal.getNumberOfPages(); for (let i = 1; i <= pages; i += 1) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(125, 106, 74); doc.text(`Horizon Farm · dossier financeur · ${today()} · ${i}/${pages}`, 105, 288, { align: 'center' }); } doc.setTextColor(47, 36, 21); }
function bullets(doc, rows, x, y, w = 176) { let cy = y; rows.forEach((row) => { const lines = doc.splitTextToSize(row, w); doc.circle(x, cy - 1.5, 0.9, 'F'); doc.text(lines, x + 5, cy); cy += Math.max(7, lines.length * 5 + 2); }); return cy; }

function buildSummary({ data, plan, lines, costs, projections, fundings, risks, financeur }) {
  const planLines = bpRows(plan, lines);
  const planCosts = bpRows(plan, costs);
  const planProjections = bpRows(plan, projections);
  const planFundings = bpRows(plan, fundings);
  const planRisks = bpRows(plan, risks);
  const official = HORIZON_FARM_OFFICIAL_BP;
  const investment = planLines.reduce((s, row) => s + amount(row), 0) || official.startupNeeds.officialTotal || 0;
  const annualRevenue = planProjections.reduce((s, row) => s + n(row.ca_estime ?? row.revenue ?? row.ca_prevu ?? row.montant), 0) || official.revenue.annualTotal || 0;
  const monthlyCosts = planCosts.reduce((s, row) => s + n(row.montant_mensuel ?? row.monthly_amount ?? row.montant ?? row.amount), 0) || Math.round((official.variableCosts.correctedAnnualTotal + official.fixedCosts.annualByYear[0] + official.payroll.annualTotal) / 12);
  const funding = planFundings.reduce((s, row) => s + n(row.montant ?? row.amount ?? row.value ?? row.valeur), 0);
  const sales = arr(data.salesOrders || data.sales_orders).reduce((s, row) => s + n(row.montant_total ?? row.total ?? row.amount), 0);
  const payments = arr(data.payments).reduce((s, row) => s + n(row.montant_paye ?? row.montant ?? row.amount), 0);
  return { financeur, planLines, planCosts, planProjections, planFundings, planRisks, investment, annualRevenue, monthlyCosts, funding, sales, payments, official, planName: plan?.nom || plan?.name || 'Business Plan Horizon Farm' };
}
function investmentRows(s) {
  const rows = s.planLines.map((line) => [clean(line.designation || line.libelle || line.name || line.id), clean(line.categorie || line.category || 'Investissement'), `${line.quantite || ''} ${line.unite || ''}`.trim() || 'forfait', line.prix_unitaire ? fmtCurrency(line.prix_unitaire) : 'à valider par devis', amount(line) ? fmtCurrency(amount(line)) : 'poste à chiffrer par devis']);
  return rows.length ? rows : [
    ['Pondeuses', 'Cheptel avicole', '3 000 sujets', 'selon devis', fmtCurrency(s.official?.layers?.startupCost || 0)],
    ['Poulets de chair', 'Cycle court', 'bandes de 500', 'selon devis', fmtCurrency(s.official?.broilers?.monthlyChickCost || 1024000)],
    ['Bovins', 'Embouche', '5 têtes/mois en roulement', 'selon devis', 'poste à chiffrer par devis'],
    ['Infrastructures', 'Poulailler, eau, clôture, stockage', 'forfaits', 'selon devis', 'poste à chiffrer par devis'],
    ['Fonds de roulement', 'Aliments, santé, salaires, transport', '3 à 6 mois', 'selon cycle', 'poste à chiffrer par devis'],
  ];
}
function costRows(s) {
  const rows = s.planCosts.map((row) => [clean(row.designation || row.libelle || row.name || row.id), row.montant_mensuel || row.monthly_amount || row.montant ? fmtCurrency(row.montant_mensuel ?? row.monthly_amount ?? row.montant) : 'à valider', clean(row.notes || row.role || row.description || 'Charge nécessaire au maintien du cycle.')]);
  return rows.length ? rows : [['Aliments', 'selon effectifs', 'Maintenir ponte, croissance chair et embouche.'], ['Santé/vaccins', 'selon protocole', 'Réduire mortalité et pertes.'], ['Main-d’œuvre', 'selon organisation', 'Assurer routines, collecte, livraison et maintenance.'], ['Eau/énergie/hygiène', 'selon site', 'Sécuriser production et biosécurité.'], ['Transport/vente', 'selon volume', 'Livrer, prospecter et encaisser.']];
}
function riskRows(s) {
  const rows = s.planRisks.map((risk) => [clean(risk.title || risk.risque || risk.nom || risk.description), clean(risk.impact || risk.niveau || risk.severity || 'moyen'), clean(risk.mitigation || risk.action || risk.notes || 'Suivi ERP et action corrective.')]);
  return rows.length ? rows : [['Risque sanitaire', 'Mortalité ou baisse production', 'Biosécurité, calendrier santé, alertes ERP, vétérinaire.'], ['Rupture aliment', 'Baisse production', 'Seuils stock, fournisseurs alternatifs, fonds roulement.'], ['Impayés clients', 'Tension de trésorerie', 'Client réel obligatoire pour crédit, relances automatiques.'], ['Panne équipement', 'Retard production', 'Maintenance planifiée et tâches critiques.'], ['Sous-chiffrage devis', 'Besoin financement insuffisant', 'Finaliser devis avant dépôt et marge de sécurité.']];
}

function generateDossier(s) {
  const f = FINANCEURS[s.financeur] || FINANCEURS.DER;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(248, 245, 239); doc.rect(0, 0, 210, 297, 'F'); doc.setTextColor(47, 36, 21);
  doc.setFontSize(23); doc.text('DOSSIER DE DEMANDE', 16, 40); doc.text('DE FINANCEMENT', 16, 52); doc.setFontSize(28); doc.text('HORIZON FARM', 16, 75);
  doc.setFontSize(11); para(doc, `Version orientée ${f.label}. ${f.angle}.`, 16, 90, 170);
  table(doc, 112, ['Rubrique', 'Information'], [['Financeur cible', f.label], ['Business Plan retenu', s.planName], ['Porteuse', 'Penda THIAW'], ['Objet', 'Financer les actifs productifs, infrastructures, équipements et fonds de roulement d’Horizon Farm.'], ['Atout clé', 'ERP opérationnel pour suivre investissement, stock, ventes, tâches, alertes, justificatifs, trésorerie et reporting.']], { margin: { left: 16, right: 16 } });

  page(doc, 'Résumé exécutif'); let y = title(doc, '1. Résumé exécutif', 30);
  y = para(doc, 'Horizon Farm est une ferme intégrée organisée autour de la production avicole, des œufs, de l’embouche bovine, des cultures et de la commercialisation structurée. Le financement demandé vise la mise en œuvre opérationnelle : actifs productifs, infrastructures, équipements, intrants et fonds de roulement.', 14, y);
  y = table(doc, y, ['Indicateur', 'Valeur'], [['Investissement structuré', fmtCurrency(s.investment)], ['CA annuel BP', fmtCurrency(s.annualRevenue)], ['Charges mensuelles estimées', fmtCurrency(s.monthlyCosts)], ['Financement déjà identifié', fmtCurrency(s.funding)], ['Ventes ERP déjà saisies', fmtCurrency(s.sales)], ['Encaissements ERP déjà suivis', fmtCurrency(s.payments)]], { fontSize: 8.5 });
  y = title(doc, '2. Pourquoi ce dossier est solide', y); bullets(doc, ['Projet multi-activités : œufs, chair, bovins, cultures et ventes.', 'Cycles opérationnels connus : chair à J+40, bovins à J+90, pondeuses suivies selon ponte réelle.', 'ERP déjà en place pour éviter les pertes de suivi : dépenses, justificatifs, stock, ventes, créances, tâches, alertes et rapports.', f.proof], 18, y);

  page(doc, 'Activités et financement'); y = title(doc, '3. Activités financées', 30);
  y = table(doc, y, ['Activité', 'Logique', 'Ce que le financement sécurise'], [['Pondeuses / œufs', 'Revenus réguliers et suivi du taux de ponte.', 'Poussins/pondeuses, aliments, santé, pondoirs, biosécurité, collecte.'], ['Poulets de chair', 'Cycles courts avec vente autour de J+40.', 'Bandes de 500, aliments, santé, suivi poids/mortalité, vente organisée.'], ['Bovins', 'Pipeline embouche avec vente autour de J+90.', 'Achats mensuels, alimentation, santé, suivi de marge et renouvellement.'], ['Cultures', 'Production complémentaire et diversification.', 'Intrants, irrigation, parcelles, main-d’œuvre, récolte et vente.'], ['Commercialisation', 'Transformer la production en cash.', 'Clients, factures, relances crédit, livraisons et reporting.']], { fontSize: 7.8 });
  y = title(doc, '4. Plan d’investissement', y); y = table(doc, y, ['Poste', 'Catégorie', 'Quantité', 'Prix', 'Montant'], investmentRows(s), { fontSize: 7.1 });

  page(doc, 'Charges, revenus, remboursement'); y = title(doc, '5. Charges et fonds de roulement', 30);
  y = table(doc, y, ['Charge', 'Montant mensuel', 'Rôle'], costRows(s), { fontSize: 7.6 });
  y = title(doc, '6. Revenus et capacité de remboursement', y);
  y = para(doc, `Le BP officiel prévoit un chiffre d’affaires annuel de ${fmtCurrency(s.annualRevenue)}. Le suivi ERP permettra de comparer chaque mois le prévu, le réalisé, le cash encaissé, les créances et les charges.`, 14, y);
  table(doc, y, ['Source', 'Suivi ERP', 'Impact remboursement'], [['Œufs', 'Ponte, tablettes, ventes, clients.', 'Revenu régulier.'], ['Chair', 'Bandes, J+40, marge par lot.', 'Cash rapide par cycle.'], ['Bovins', 'Achats, J+90, marge par tête.', 'Valeur plus élevée par vente.'], ['Cultures', 'Parcelle, intrants, rendement.', 'Diversification et sécurité.'], ['Créances', 'Relances automatiques.', 'Réduction du risque cash.']], { fontSize: 7.8 });

  page(doc, 'Gouvernance ERP'); y = title(doc, '7. Suivi, transparence et gouvernance', 30);
  y = table(doc, y, ['Fonction ERP', 'Ce que le financeur peut suivre'], [['Investissements', 'Chaque dépense peut être reliée à un BP, une transaction, un document et un actif créé.'], ['Ventes', 'Client explicite, paiement, créance, facture, livraison et impact stock automatiques.'], ['Finances', 'Cash encaissé, dépenses payées, créances, dettes et position nette.'], ['Comptabilité', 'Écritures automatiques et régularisations exceptionnelles.'], ['Tâches / alertes', 'Routines ferme, relances crédit, livraisons, santé, biosécurité et maintenance.'], ['Rapports', 'Dossier financeur, exports, preuves et suivi périodique.']], { fontSize: 7.6 });
  y = title(doc, '8. Risques et réponses', y); table(doc, y, ['Risque', 'Impact', 'Réponse'], riskRows(s), { fontSize: 7.3 });

  page(doc, 'Demande et pièces'); y = title(doc, '9. Utilisation des fonds demandés', 30);
  y = table(doc, y, ['Affectation', 'Utilisation concrète'], [['Actifs productifs', 'Poussins, pondeuses, bovins, intrants et sujets de démarrage.'], ['Infrastructures', 'Poulailler, eau, clôture, stockage, sécurité, irrigation.'], ['Équipements', 'Mangeoires, abreuvoirs, matériel agricole, pompes, maintenance.'], ['Fonds de roulement', 'Aliments, santé, salaires, transport, énergie et imprévus de cycle.'], ['Commercialisation', 'Facturation, livraison, relance, emballage et développement client.']], { fontSize: 7.8 });
  y = title(doc, '10. Pièces à joindre avant dépôt', y);
  bullets(doc, ['Devis ou factures proforma pour chaque poste matériel/infrastructure/cheptel.', 'Justificatif du site ou de la zone d’exploitation.', 'Pièce d’identité, CV, documents administratifs disponibles.', 'Prévisions financières détaillées issues du BP retenu.', 'Photos, plan de site ou éléments de preuve terrain.', 'Engagement de reporting ERP périodique au financeur.'], 18, y, 170);

  page(doc, 'Conclusion'); y = title(doc, '11. Conclusion', 30);
  y = para(doc, `Horizon Farm présente un projet agricole structuré, multi-activités et piloté par données. Le dossier est adapté à ${f.label} : ${f.angle}.`, 14, y);
  y = para(doc, 'Le financement demandé ne finance pas une idée abstraite : il finance des actifs productifs, des cycles de vente connus, une organisation opérationnelle et un système ERP capable de suivre les fonds, les preuves, les ventes, les stocks, les alertes et les résultats.', 14, y);
  doc.setFontSize(15); doc.text('Horizon Farm : produire, vendre, tracer, rembourser.', 105, y + 18, { align: 'center' });
  footer(doc); doc.save(`dossier-financeur-${f.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-horizon-farm-${today()}.pdf`);
}

export default function FinancingDossierGenerator({ data = {}, onCreateDocument, onRefreshDocuments, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const businessPlans = useCrudModule('business_plans');
  const investmentLines = useCrudModule('bp_investment_lines');
  const recurringCosts = useCrudModule('bp_recurring_costs');
  const revenueProjections = useCrudModule('bp_revenue_projections');
  const fundingSources = useCrudModule('bp_funding_sources');
  const risks = useCrudModule('bp_risks');
  const plans = arr(businessPlans.rows);
  const [planId, setPlanId] = useState('');
  const [financeur, setFinanceur] = useState('DER');
  const [saving, setSaving] = useState(false);
  const selectedPlan = useMemo(() => plans.find((p) => String(p.id) === String(planId)) || plans.find((p) => String(p.nom || p.name || '').toLowerCase().includes('horizon farm')) || plans[0] || null, [plans, planId]);
  const summary = useMemo(() => buildSummary({ data, plan: selectedPlan, lines: investmentLines.rows, costs: recurringCosts.rows, projections: revenueProjections.rows, fundings: fundingSources.rows, risks: risks.rows, financeur }), [data, selectedPlan, investmentLines.rows, recurringCosts.rows, revenueProjections.rows, fundingSources.rows, risks.rows, financeur]);
  const generate = async () => {
    if (!selectedPlan && plans.length > 1) return toast.error('Choisis le Business Plan concerné.');
    try {
      setSaving(true);
      generateDossier(summary);
      await onCreateDocument?.({ id: makeId('DOC'), title: `Dossier financeur ${FINANCEURS[financeur]?.label || financeur}`, document_category: 'dossier_financeur', module_source: 'rapports', entity_type: 'business_plan', entity_id: selectedPlan?.id || 'horizon_farm', status: 'genere', financeur, generated_at: new Date().toISOString() });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'dossier_financeur_genere', module_source: 'rapports', entity_type: 'business_plan', entity_id: selectedPlan?.id || 'horizon_farm', title: `Dossier financeur généré — ${FINANCEURS[financeur]?.label || financeur}`, severity: 'info', event_date: today() });
      await Promise.allSettled([onRefreshDocuments?.(), onRefreshBusinessEvents?.()]);
      toast.success('Dossier financeur généré');
    } catch (error) { toast.error(error.message || 'Génération impossible'); } finally { setSaving(false); }
  };
  return <div className="space-y-4"><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="flex items-center gap-2 font-black text-[#2f2415]"><ShieldCheck size={18} /> Dossier financeur enrichi</p><p className="mt-1 text-sm text-[#8a7456]">Choisis le BP et le financeur. Le PDF adapte l’argumentaire et évite les lignes génériques inutiles.</p></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="space-y-1"><span className="text-xs font-bold text-[#8a7456]">Business Plan</span><select value={planId || selectedPlan?.id || ''} onChange={(e) => setPlanId(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm">{plans.length ? plans.map((p) => <option key={p.id} value={p.id}>{p.nom || p.name || p.id}</option>) : <option value="">BP Horizon Farm officiel</option>}</select></label><label className="space-y-1"><span className="text-xs font-bold text-[#8a7456]">Financeur cible</span><select value={financeur} onChange={(e) => setFinanceur(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm">{Object.entries(FINANCEURS).map(([key, f]) => <option key={key} value={key}>{f.label}</option>)}</select></label><button type="button" disabled={saving} onClick={generate} className="min-h-[44px] self-end rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white disabled:opacity-60"><Download size={15} className="inline" /> {saving ? 'Génération...' : 'Générer dossier PDF'}</button></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"><Mini label="Investissement" value={fmtCurrency(summary.investment)} /><Mini label="CA annuel BP" value={fmtCurrency(summary.annualRevenue)} /><Mini label="Charges mensuelles" value={fmtCurrency(summary.monthlyCosts)} /><Mini label="Financeur" value={FINANCEURS[financeur]?.label} /></div></div>;
}
function Mini({ label, value }) { return <div className="rounded-xl border border-[#eadcc2] bg-white p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] break-words">{value}</p></div>; }
