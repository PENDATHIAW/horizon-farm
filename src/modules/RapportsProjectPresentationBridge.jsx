import { Download, FileText, Presentation, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (v) => Array.isArray(v) ? v : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const n = (v) => toNumber(v);
const sumBy = (rows, keys) => arr(rows).reduce((s, r) => s + keys.reduce((v, k) => v || n(r?.[k]), 0), 0);
const stockValue = (rows) => arr(rows).reduce((s, r) => s + n(r.quantite ?? r.quantity) * n(r.prixUnit ?? r.prixunit ?? r.prix_unitaire ?? r.unit_price), 0);
const activePoultry = (lots) => arr(lots).reduce((s, l) => s + Math.max(0, n(l.current_count ?? l.effectif_actuel ?? l.initial_count) - n(l.mortality ?? l.morts) - n(l.vendus)), 0);
const clean = (value = '') => String(value || '').replace(/\s{2,}/g, ' ').trim();
const lineAmount = (row = {}) => n(row.total ?? row.montant ?? row.amount ?? row.cost ?? row.cout ?? (n(row.quantite) * n(row.prix_unitaire)));
const bpRow = (plan, rows = []) => plan?.id ? arr(rows).filter((row) => String(row.business_plan_id || '') === String(plan.id)) : arr(rows);
const bestPlan = (plans = []) => arr(plans).find((plan) => String(plan.nom || plan.name || '').toLowerCase().includes('horizon farm')) || arr(plans)[0] || null;

const DEFAULT_INVESTMENT_LINES = [
  ['Achat poussins pondeuses', 'Cheptel avicole', '4 000 sujets', '900 FCFA', '3 600 000 FCFA'],
  ['Achat poussins chair', 'Cheptel avicole', '200 sujets', '350 FCFA', '70 000 FCFA'],
  ['Achat bovins', 'Cheptel ruminant', '10 têtes', 'À confirmer par devis', 'À compléter'],
  ['Achat moutons', 'Cheptel ruminant', '5 têtes', 'À confirmer par devis', 'À compléter'],
  ['Achat chèvres', 'Cheptel ruminant', '5 têtes', 'À confirmer par devis', 'À compléter'],
  ['Poulailler / bâtiment avicole', 'Infrastructure', '1 forfait', 'Devis à joindre', 'À compléter'],
  ['Poussinière / chauffage', 'Équipement', '1 lot', 'Devis à joindre', 'À compléter'],
  ['Pondoirs, abreuvoirs, mangeoires', 'Équipement avicole', 'Lots', 'Devis à joindre', 'À compléter'],
  ['Eau / pompe / réservoir', 'Infrastructure', '1 forfait', 'Devis à joindre', 'À compléter'],
  ['Magasin stock', 'Infrastructure', '1 forfait', 'Devis à joindre', 'À compléter'],
  ['Clôture / sécurité', 'Infrastructure', '1 forfait', 'Devis à joindre', 'À compléter'],
  ['Irrigation', 'Équipement cultures', '1 lot', 'Devis à joindre', 'À compléter'],
  ['Matériel agricole', 'Équipement', '1 lot', 'Devis à joindre', 'À compléter'],
  ['Transport et installation', 'Logistique', '1 forfait', 'Devis à joindre', 'À compléter'],
  ['Fonds de roulement', 'Exploitation', '1 forfait', 'À définir selon cycle', 'À compléter'],
  ['Démarches administratives', 'Administratif', '1 forfait', 'Devis / frais réels', 'À compléter'],
  ['Imprévus de démarrage', 'Sécurité financière', '1 forfait', 'À définir', 'À compléter'],
];
const DEFAULT_COST_LINES = [
  ['Location champ prêt à exploiter', 'Accès rapide à une surface productive.'],
  ['Location bâtiment / poulailler', 'Démarrage opérationnel de l’activité avicole.'],
  ['Aliment pondeuses', 'Maintien de la ponte et réduction du risque de chute de production.'],
  ['Aliment poulets de chair', 'Croissance régulière sur cycle court.'],
  ['Aliment ruminants', 'Croissance, état corporel et valeur de revente.'],
  ['Salaires / main-d’œuvre', 'Organisation des tâches quotidiennes.'],
  ['Santé / vaccins / vétérinaire', 'Prévention des pertes sanitaires.'],
  ['Énergie / eau / nettoyage', 'Hygiène, biosécurité et continuité de production.'],
  ['Transport / commercialisation', 'Acheminement des intrants et vente des produits.'],
  ['Maintenance', 'Prévention des pannes.'],
  ['Imprévus exploitation', 'Couverture des aléas de démarrage.'],
];

function buildSummary(data, bp) {
  const sales = sumBy(data.salesOrders, ['montant_total', 'total', 'amount']);
  const paid = Math.max(sumBy(data.payments, ['montant_paye', 'montant', 'amount']), sumBy(data.salesOrders, ['montant_paye', 'paid_amount']));
  const inCash = arr(data.transactions).filter((r) => String(r.type || '').toLowerCase() === 'entree').reduce((s, r) => s + n(r.montant), 0);
  const outCash = arr(data.transactions).filter((r) => String(r.type || '').toLowerCase() === 'sortie').reduce((s, r) => s + n(r.montant), 0);
  const plan = bestPlan(bp.businessPlans);
  const planLines = bpRow(plan, bp.investmentLines);
  const planCosts = bpRow(plan, bp.recurringCosts);
  const planProjections = bpRow(plan, bp.revenueProjections);
  const planFundings = bpRow(plan, bp.fundingSources);
  const planRisks = bpRow(plan, bp.risks);
  const investment = planLines.reduce((s, row) => s + lineAmount(row), 0) || sumBy(bp.businessPlans, ['budget_total', 'investment_total', 'montant_total']);
  const recurring = planCosts.reduce((s, row) => s + n(row.montant_mensuel ?? row.monthly_amount ?? row.montant ?? row.amount), 0);
  const projected = planProjections.reduce((s, row) => s + n(row.ca_estime ?? row.revenue ?? row.ca_prevu ?? row.montant), 0);
  return {
    plan, planLines, planCosts, planProjections, planFundings, planRisks,
    sales, paid, receivables: Math.max(0, sales - paid), revenue: Math.max(sales, inCash), expenses: outCash, margin: Math.max(sales, inCash) - outCash,
    animals: arr(data.animaux).length, lots: arr(data.lots).length, poultry: activePoultry(data.lots), cultures: arr(data.cultures).filter((r) => !['parcelle', 'campagne', 'performance'].includes(String(r.record_type || r.type_fiche || '').toLowerCase())).length,
    stock: stockValue(data.stocks), stockCritical: arr(data.stocks).filter((r) => n(r.seuil) > 0 && n(r.quantite) <= n(r.seuil)).length,
    clients: arr(data.clients).length, suppliers: arr(data.fournisseurs).length, tasks: arr(data.taches).length, alerts: arr(data.alertes).length,
    plans: arr(bp.businessPlans).length, investment, recurring, projected, funding: planFundings.reduce((s, row) => s + n(row.montant ?? row.amount ?? row.value ?? row.valeur), 0), risks: planRisks.length,
  };
}

function addPageTitle(doc, title) {
  doc.setFillColor(47, 36, 21);
  doc.rect(0, 0, 210, 17, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('HORIZON FARM', 12, 11);
  doc.text(title, 198, 11, { align: 'right' });
  doc.setTextColor(47, 36, 21);
}
function addFooter(doc) {
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(125, 106, 74);
    doc.text(`Horizon Farm · Dossier de demande de financement · ${today()} · ${i}/${pages}`, 105, 288, { align: 'center' });
  }
  doc.setTextColor(47, 36, 21);
}
function addSection(doc, title, y = 28) {
  doc.setFontSize(15);
  doc.setTextColor(47, 36, 21);
  doc.text(title, 14, y);
  doc.setDrawColor(201, 169, 106);
  doc.line(14, y + 3, 196, y + 3);
  doc.setFontSize(10);
  return y + 12;
}
function paragraph(doc, text, x, y, width = 182, lineHeight = 5.2) {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight + 4;
}
function bullets(doc, items, x, y, width = 176) {
  let cy = y;
  items.forEach((item) => {
    const lines = doc.splitTextToSize(item, width);
    doc.circle(x, cy - 1.5, 0.9, 'F');
    doc.text(lines, x + 5, cy);
    cy += Math.max(7, lines.length * 5 + 2);
  });
  return cy;
}
function page(doc, title) {
  doc.addPage();
  addPageTitle(doc, title);
}
function table(doc, startY, head, body, options = {}) {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    theme: 'grid',
    headStyles: { fillColor: [47, 36, 21], textColor: 255, fontSize: 8, cellPadding: 2 },
    styles: { fontSize: options.fontSize || 8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
    alternateRowStyles: { fillColor: [252, 249, 242] },
    margin: { left: 14, right: 14 },
    ...options,
  });
  return doc.lastAutoTable.finalY + 8;
}
function investmentRows(summary) {
  const rows = summary.planLines.map((line) => [
    clean(line.designation || line.libelle || line.name || line.id),
    clean(line.categorie || line.category || ''),
    `${line.quantite || ''} ${line.unite || ''}`.trim() || '—',
    line.prix_unitaire ? fmtCurrency(line.prix_unitaire) : 'À compléter',
    lineAmount(line) ? fmtCurrency(lineAmount(line)) : 'À compléter',
  ]);
  return rows.length ? rows : DEFAULT_INVESTMENT_LINES;
}
function costRows(summary) {
  const rows = summary.planCosts.map((cost) => [
    clean(cost.designation || cost.libelle || cost.name || cost.id),
    cost.montant_mensuel || cost.monthly_amount || cost.montant ? fmtCurrency(cost.montant_mensuel ?? cost.monthly_amount ?? cost.montant) : 'À compléter',
    clean(cost.notes || cost.role || cost.description || 'Charge prévue pour sécuriser le cycle.'),
  ]);
  return rows.length ? rows : DEFAULT_COST_LINES.map(([a, b]) => [a, 'À compléter', b]);
}
function projectionRows(summary) {
  const rows = summary.planProjections.map((row) => {
    const ca = n(row.ca_estime ?? row.revenue ?? row.ca_prevu ?? row.montant);
    const charges = n(row.charges_estimees ?? row.projected_charges ?? row.charges);
    return [`Mois ${row.mois_index || row.mois || row.month || ''}`.trim(), fmtCurrency(ca), fmtCurrency(charges), fmtCurrency(ca - charges)];
  });
  return rows.length ? rows : [['Œufs', 'Revenus réguliers', 'Taux de ponte, plateaux vendus, marge par plateau', 'À compléter'], ['Poulets de chair', 'Cycles courts', 'Mortalité, coût aliment, poids moyen, marge par lot', 'À compléter'], ['Ruminants', 'Valorisation à plus forte valeur', 'Coût par tête, poids, santé, prix de vente', 'À compléter'], ['Cultures', 'Revenus par campagne', 'Intrants, rendement, pertes, marge par parcelle', 'À compléter']];
}
function riskRows(summary) {
  const rows = summary.planRisks.map((risk) => [clean(risk.title || risk.risque || risk.nom || risk.description), clean(risk.impact || risk.niveau || risk.severity || ''), clean(risk.mitigation || risk.action || risk.notes || 'À suivre')]);
  return rows.length ? rows : [
    ['Rupture d’aliment', 'Baisse de production et perte de marge', 'Seuils de stock, fournisseurs alternatifs, fonds de roulement dédié'],
    ['Risque sanitaire', 'Mortalité, baisse de production, coûts vétérinaires', 'Calendrier vaccinal, suivi vétérinaire, biosécurité, alertes ERP'],
    ['Fluctuation des prix', 'Hausse des coûts ou baisse de marge', 'Historique fournisseurs, négociation, ajustement prix de vente'],
    ['Retard de ventes ou impayés', 'Tension de trésorerie', 'Suivi clients, factures, relances, ventes diversifiées'],
    ['Pannes équipements', 'Interruption d’activité', 'Maintenance planifiée et tâches d’entretien'],
    ['Mauvaise utilisation des fonds', 'Perte de confiance du financeur', 'Traçabilité ERP, rapports périodiques et justificatifs'],
  ];
}

function generatePdf(summary) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(248, 245, 239);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(47, 36, 21);
  doc.setFontSize(24);
  doc.text('DOSSIER DE DEMANDE', 16, 42);
  doc.text('DE FINANCEMENT', 16, 53);
  doc.setFontSize(28);
  doc.text('HORIZON FARM', 16, 75);
  doc.setFontSize(11);
  paragraph(doc, 'Ferme intégrée et pilotée : aviculture, élevage, cultures, infrastructures et fonds de roulement.', 16, 88, 170);
  autoTable(doc, { startY: 112, head: [['Rubrique', 'Information']], body: [['Porteuse du projet', 'Penda THIAW'], ['Localisation', summary.plan?.localisation || 'Dakar / Sénégal — zone d’exploitation à préciser'], ['Secteurs', 'Aviculture, élevage ruminants, cultures/maraîchage, commercialisation de produits agricoles'], ['Cibles financeurs', 'FONGIP, DER/FJ, banques, fonds d’investissement, partenaires publics ou privés'], ['Objet', 'Financer la mise en place opérationnelle de la ferme. L’ERP existe déjà et sert au pilotage, au reporting et à la traçabilité.']], theme: 'grid', headStyles: { fillColor: [47, 36, 21] }, styles: { fontSize: 9, cellPadding: 3 }, margin: { left: 16, right: 16 } });

  page(doc, 'Sommaire');
  let y = addSection(doc, 'Sommaire', 30);
  y = bullets(doc, ['1. Résumé exécutif', '2. Présentation de la porteuse du projet', '3. Présentation du projet Horizon Farm', '4. Activités à financer', '5. Plan d’investissement prévisionnel', '6. Charges d’exploitation prévues', '7. Modèle économique et revenus attendus', '8. Organisation et gouvernance opérationnelle', '9. Rôle de l’ERP dans la solidité du dossier', '10. Impact économique, social et territorial', '11. Risques et mesures d’atténuation', '12. Besoin de financement et utilisation des fonds', '13. Pièces à joindre', '14. Conclusion'], 18, y);

  page(doc, 'Résumé exécutif');
  y = addSection(doc, '1. Résumé exécutif', 30);
  y = paragraph(doc, 'Horizon Farm est un projet de ferme intégrée visant à produire et commercialiser des produits agricoles de qualité à travers plusieurs activités complémentaires : poules pondeuses, poulets de chair, élevage bovin, ovin et caprin, cultures/maraîchage, infrastructures de stockage et équipements agricoles.', 14, y);
  y = paragraph(doc, 'La demande de financement porte sur la mise en place opérationnelle de la ferme : acquisition des sujets animaux, installation avicole, équipements, infrastructures, intrants, fonds de roulement, santé animale, alimentation et charges de démarrage.', 14, y);
  y = table(doc, y, ['Dimension', 'Résumé'], [['Projet', 'Création et déploiement d’une ferme intégrée Horizon Farm.'], ['Activités prévues', 'Pondeuses, poulets de chair, bovins, ovins, caprins, cultures/maraîchage, vente de produits agricoles.'], ['Besoin', 'Financement d’investissement et de fonds de roulement. Montant final à renseigner avec les devis.'], ['Atout différenciant', 'ERP déjà disponible : suivi des fonds, alertes, reporting, traçabilité, contrôle des coûts.'], ['Objectif', 'Construire une ferme rentable, traçable, organisée et capable de monter en capacité progressivement.']], { fontSize: 8.5 });
  y = addSection(doc, '2. Présentation de la porteuse du projet', y);
  paragraph(doc, 'Le projet est porté par Penda THIAW, ingénieure de formation et professionnelle expérimentée en pilotage commercial, performance, management d’équipes et stratégie analytique. Cette expérience est adaptée à Horizon Farm : structurer, suivre, vendre, piloter la marge, fidéliser les clients et rendre compte aux partenaires financiers.', 14, y);

  page(doc, 'Présentation du projet');
  y = addSection(doc, '3. Présentation du projet Horizon Farm', 30);
  y = paragraph(doc, 'Horizon Farm est conçue comme une ferme intégrée organisée autour de plusieurs pôles productifs et commerciaux. Le projet vise une montée en puissance progressive : commencer avec des activités structurantes, sécuriser les flux, générer des revenus réguliers, puis renforcer les capacités au fil des cycles.', 14, y);
  y = bullets(doc, ['Installer une activité avicole structurée autour des poules pondeuses et des poulets de chair.', 'Constituer un noyau d’élevage ruminant : bovins, ovins et caprins.', 'Mettre en place des cultures/maraîchage avec suivi par parcelle et par campagne.', 'Créer les infrastructures nécessaires : poulailler, poussinière, magasin de stock, eau, clôture, irrigation et équipements.', 'Mettre en place un système de vente, de suivi clients, de facturation et de recouvrement.', 'Utiliser l’ERP existant pour rendre la gestion transparente, traçable et maîtrisée.'], 18, y);
  y = addSection(doc, '4. Activités à financer', y + 2);
  table(doc, y, ['Activité', 'Ce qui sera financé', 'Objectif'], [['Poules pondeuses', 'Poussins, poulailler, poussinière, pondoirs, alimentation, vaccins, litière, suivi sanitaire.', 'Générer des revenus réguliers avec la vente d’œufs.'], ['Poulets de chair', 'Poussins chair, alimentation, suivi de croissance, santé, vente par lot.', 'Créer des cycles courts de revenus.'], ['Élevage bovin', 'Bovins, alimentation, santé, clôture, équipements et suivi de croissance.', 'Développer une activité à forte valeur de revente.'], ['Ovins et caprins', 'Moutons et chèvres, alimentation, suivi sanitaire et reproduction progressive.', 'Diversifier le cheptel et les sources de revenus.'], ['Cultures/maraîchage', 'Champ, irrigation, semences, engrais, traitements, main-d’œuvre, matériel agricole.', 'Produire des cultures rentables et valoriser les parcelles.'], ['Fonds de roulement', 'Alimentation, salaires, santé, transport, énergie, emballages, maintenance, imprévus.', 'Assurer les premiers cycles sans rupture de trésorerie.']], { fontSize: 7.7 });

  page(doc, 'Investissements');
  y = addSection(doc, '5. Plan d’investissement prévisionnel', 30);
  y = paragraph(doc, 'Le plan d’investissement reprend la structure du Business Plan Horizon Farm disponible dans l’ERP. Les montants définitifs doivent être confirmés avec les devis fournisseurs, mais le périmètre d’investissement est déjà organisé par nature de dépense et par activité.', 14, y);
  y = table(doc, y, ['Ligne d’investissement', 'Catégorie', 'Quantité', 'Prix unitaire', 'Total prévu'], investmentRows(summary), { fontSize: 7 });
  y = paragraph(doc, 'Note : les lignes “à compléter” ne sont pas des dépenses vagues. Ce sont des postes identifiés dans le Business Plan, dont le montant doit être validé par les fournisseurs retenus.', 14, Math.min(y, 260));

  page(doc, 'Charges & revenus');
  y = addSection(doc, '6. Charges d’exploitation prévues', 30);
  y = paragraph(doc, 'Au-delà de l’investissement initial, Horizon Farm doit sécuriser ses charges de fonctionnement afin d’éviter une rupture de cycle. Le fonds de roulement est donc une composante essentielle du financement demandé.', 14, y);
  y = table(doc, y, ['Charge mensuelle prévue', 'Montant', 'Rôle dans le projet'], costRows(summary), { fontSize: 7.5 });
  y = addSection(doc, '7. Modèle économique et revenus attendus', Math.min(y, 210));
  table(doc, y, ['Source de revenus', 'Logique économique', 'Indicateurs de suivi', 'Prévision'], projectionRows(summary), { fontSize: 7.3 });

  page(doc, 'Organisation & ERP');
  y = addSection(doc, '8. Organisation et gouvernance opérationnelle', 30);
  y = table(doc, y, ['Fonction', 'Responsabilités principales'], [['Direction du projet', 'Planification, suivi du financement, relations partenaires, arbitrages stratégiques.'], ['Responsable terrain / exploitation', 'Suivi des activités quotidiennes, coordination des équipes, remontée des données.'], ['Équipe avicole', 'Alimentation, hygiène, suivi des lots, collecte des œufs, signalement des anomalies.'], ['Équipe élevage', 'Alimentation ruminants, pesée, suivi sanitaire, reproduction, sécurité du cheptel.'], ['Équipe cultures', 'Préparation parcelles, semis, irrigation, traitements, récoltes.'], ['Commercialisation', 'Prospection, ventes, livraison, suivi clients, recouvrement.'], ['Appui vétérinaire / fournisseurs', 'Prévention sanitaire, interventions, approvisionnements et maintenance.']], { fontSize: 7.8 });
  y = addSection(doc, '9. Rôle de l’ERP dans la solidité du dossier', y);
  table(doc, y, ['Garantie apportée par l’ERP', 'Effet pour le financeur'], [['Suivi des investissements', 'Chaque dépense financée peut être liée à une ligne du Business Plan et à un actif réel.'], ['Traçabilité des fonds', 'Les sorties de trésorerie sont catégorisées et justifiées par activité.'], ['Pilotage des actifs', 'Poussins, animaux, cultures et équipements deviennent des éléments suivis.'], ['Alertes de gestion', 'Stocks critiques, vaccins en retard, impayés, tâches urgentes et risques financiers sont remontés.'], ['Reporting régulier', 'Rapports d’activité, stock, ventes, trésorerie et impact.'], ['Mesure de la rentabilité', 'Suivi des coûts, revenus, marges, ROI et payback au fil des cycles.']], { fontSize: 7.5 });

  page(doc, 'Impact & risques');
  y = addSection(doc, '10. Impact économique, social et territorial', 30);
  y = bullets(doc, ['Création d’emplois directs et indirects autour de la production, de l’entretien, de la vente et de la logistique.', 'Production locale d’œufs, volailles, viande et produits maraîchers.', 'Structuration d’une chaîne de valeur locale avec fournisseurs, vétérinaires, transporteurs et clients.', 'Renforcement de la sécurité alimentaire par une production organisée et traçable.', 'Montée en compétences des équipes terrain grâce à des routines, tâches, indicateurs et tableaux de bord.', 'Création d’un modèle de ferme pilotée pouvant être répliqué ou étendu.'], 18, y);
  y = addSection(doc, '11. Risques et mesures d’atténuation', y + 2);
  table(doc, y, ['Risque', 'Impact potentiel', 'Mesure d’atténuation'], riskRows(summary), { fontSize: 7.4 });

  page(doc, 'Financement & pièces');
  y = addSection(doc, '12. Besoin de financement et utilisation des fonds', 30);
  y = paragraph(doc, `Le montant sollicité sera déterminé à partir du plan d’investissement final et des devis fournisseurs. À ce stade, l’investissement structuré dans l’ERP représente ${fmtCurrency(summary.investment)} et les charges mensuelles identifiées représentent ${fmtCurrency(summary.recurring)}.`, 14, y);
  y = table(doc, y, ['Affectation des fonds', 'Description'], [['Cheptel avicole', 'Poussins pondeuses, poussins chair, équipements de production, santé et alimentation de démarrage.'], ['Cheptel ruminant', 'Bovins, ovins, caprins et charges de mise en place.'], ['Infrastructures', 'Poulailler, poussinière, magasin, eau, clôture, sécurité, irrigation.'], ['Équipements agricoles', 'Matériel de production, abreuvoirs, mangeoires, outils, stockage.'], ['Fonds de roulement', 'Alimentation, salaires, transport, santé, énergie, consommables, imprévus.'], ['Commercialisation', 'Emballages, livraison, prospection, relation client.']], { fontSize: 7.8 });
  y = addSection(doc, '13. Pièces à joindre au dossier', y);
  y = bullets(doc, ['CV de la porteuse du projet.', 'Pièce d’identité et justificatif de domicile.', 'Devis ou factures proforma pour infrastructures, équipements, poussins, animaux, aliments et intrants.', 'Plan d’exploitation ou justificatif de disponibilité du terrain / bail / convention d’usage.', 'Prévisions financières détaillées : investissement, charges, chiffre d’affaires, marge, remboursement.', 'Éventuels documents administratifs : NINEA, registre de commerce ou statut de l’entreprise si disponible.', 'Photos, plan de site ou tout document permettant de situer le projet.'], 18, y, 170);

  page(doc, 'Conclusion');
  y = addSection(doc, '14. Conclusion', 30);
  y = paragraph(doc, 'Horizon Farm est un projet agricole structuré, porté par un profil capable d’allier vision entrepreneuriale, rigueur analytique, organisation commerciale et pilotage opérationnel. La demande de financement vise la mise en place concrète de la ferme : sujets animaux, volailles, cultures, infrastructures, équipements et fonds de roulement.', 14, y);
  y = paragraph(doc, 'L’ERP déjà disponible renforce la crédibilité du projet : il apporte une méthode de suivi des investissements, de contrôle des charges, de traçabilité des actifs, de reporting et de mesure de la rentabilité. Le financement ne servira pas à créer cet outil ; il servira à produire, vendre, employer, structurer et faire grandir Horizon Farm.', 14, y);
  doc.setFontSize(15);
  doc.setTextColor(47, 36, 21);
  doc.text('Horizon Farm : produire avec méthode, piloter avec transparence,', 105, y + 18, { align: 'center' });
  doc.text('grandir avec confiance.', 105, y + 28, { align: 'center' });

  page(doc, 'Annexe');
  y = addSection(doc, 'Annexe — Budget de travail issu du BP ERP', 30);
  y = paragraph(doc, 'Cette annexe facilite la finalisation du dossier avec les devis. Elle peut être retirée de la version envoyée au financeur si le budget complet est intégré dans le corps du document.', 14, y);
  table(doc, y, ['Poste', 'Statut dans le BP', 'Action avant dépôt'], investmentRows(summary).slice(0, 12).map((row) => [row[0], row[4] === 'À compléter' ? 'Poste identifié, montant à valider.' : 'Quantité et montant renseignés.', row[4] === 'À compléter' ? 'Joindre devis fournisseur et compléter le montant.' : 'Joindre devis/facture proforma et calendrier d’achat.']), { fontSize: 7.4 });

  addFooter(doc);
  doc.save(`dossier-demande-financement-horizon-farm-${today()}.pdf`);
}

export default function RapportsProjectPresentationBridge({ data = {}, onCreateDocument, onRefreshDocuments, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [saving, setSaving] = useState(false);
  const businessPlans = useCrudModule('business_plans');
  const investmentLines = useCrudModule('bp_investment_lines');
  const recurringCosts = useCrudModule('bp_recurring_costs');
  const revenueProjections = useCrudModule('bp_revenue_projections');
  const fundingSources = useCrudModule('bp_funding_sources');
  const risks = useCrudModule('bp_risks');
  const bp = { businessPlans: businessPlans.rows, investmentLines: investmentLines.rows, recurringCosts: recurringCosts.rows, revenueProjections: revenueProjections.rows, fundingSources: fundingSources.rows, risks: risks.rows };
  const summary = useMemo(() => buildSummary(data, bp), [data, businessPlans.rows, investmentLines.rows, recurringCosts.rows, revenueProjections.rows, fundingSources.rows, risks.rows]);

  const generate = async () => {
    try {
      setSaving(true);
      generatePdf(summary);
      const docId = makeId('DOC');
      await onCreateDocument?.({ id: docId, title: `Dossier demande financement Horizon Farm ${today()}`, document_category: 'presentation_projet', module_source: 'rapports', entity_type: 'projet', entity_id: 'horizon-farm-erp', related_id: 'horizon-farm-erp', status: 'genere', generated_at: now(), summary: 'Dossier PDF de demande de financement Horizon Farm généré.' });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'dossier_financement_genere', module_source: 'rapports', entity_type: 'projet', entity_id: 'horizon-farm-erp', title: 'Dossier de financement Horizon Farm généré', description: `${fmtCurrency(summary.investment)} investissements · ${fmtCurrency(summary.recurring)} charges mensuelles`, event_date: today(), severity: 'info', linked_document_id: docId, saisies_evitees: 4 });
      await Promise.allSettled([onRefreshDocuments?.(), onRefreshBusinessEvents?.()]);
      toast.success('Dossier PDF généré');
    } catch (error) {
      toast.error(error.message || 'Génération PDF impossible');
    } finally { setSaving(false); }
  };

  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Dossier financement</p><h3 className="font-black text-[#2f2415]">Horizon Farm — Demande de financement</h3><p className="text-sm text-[#8a7456] mt-1">PDF complet : projet, activités, budget, charges, revenus, ERP, impact, risques et pièces à joindre.</p></div><button type="button" disabled={saving} onClick={generate} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? <RefreshCw size={14} className="inline animate-spin" /> : <Download size={14} className="inline" />} Générer le dossier PDF</button></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-2"><Metric icon={Presentation} label="BP" value={`${summary.plans} plan(s)`} /><Metric icon={FileText} label="Investissements" value={fmtCurrency(summary.investment)} /><Metric icon={FileText} label="Charges mensuelles" value={fmtCurrency(summary.recurring)} /><Metric icon={FileText} label="Revenus projetés" value={fmtCurrency(summary.projected)} /></div></div>;
}
function Metric({ icon: Icon, label, value }) { return <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><Icon size={14} className="text-[#9a6b12]" /><p className="text-xs text-[#8a7456] mt-1">{label}</p><p className="font-black text-[#2f2415]">{value}</p></div>; }
