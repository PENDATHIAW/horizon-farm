import { FileJson, GitBranch, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { auditManifest, auditRequiredDataKeys } from '../audit/auditManifest';
import { buildAuditCoverageStats, buildAuditInspectionBacklog, buildAuditInspectionCoverage } from '../audit/auditInspectionCoverage';
import { getDeepAuditFocus } from '../audit/deepAuditChecklist';
import { normalizeAuditFinding, sortAuditFindings } from '../audit/auditRoadmapSchema';
import useCrudModule from '../hooks/useCrudModule';

const arr = (value) => Array.isArray(value) ? value : [];
const n = (value) => Number(value || 0);
const clean = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const amount = (row = {}) => n(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.revenu_reel ?? row.revenu_estime);
const linkedId = (row = {}) => String(row.order_id || row.sale_id || row.source_record_id || row.related_id || row.commande_id || '');
const isAnimalSale = (row = {}) => /animal|bovin|ovin|caprin|bov|ov-|cap/.test(clean(`${row.source_type || ''} ${row.product_name || ''} ${row.source_id || ''} ${row.libelle || ''}`));
const isAvicoleSale = (row = {}) => /avicole|poulet|chair|oeuf|œuf|pondeuse|lot/.test(clean(`${row.source_type || ''} ${row.product_name || ''} ${row.source_id || ''} ${row.libelle || ''}`));
const isCultureSale = (row = {}) => /culture|tomate|laitue|piment|recolte|récolte/.test(clean(`${row.source_type || ''} ${row.product_name || ''} ${row.source_id || ''} ${row.libelle || ''}`));
const isFinanceRevenue = (row = {}) => /entree|entrée|vente|encaissement|recette|revenu|produit/.test(clean(`${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.libelle || ''}`));
const isExpense = (row = {}) => /sortie|depense|dépense|charge|achat|aliment|sante|santé|salaire|investissement/.test(clean(`${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.libelle || ''}`));

function addFinding(list, item) {
  list.push(normalizeAuditFinding(item));
}

function buildFindings(data) {
  const findings = [];
  const orders = arr(data.sales_orders);
  const payments = arr(data.payments);
  const finances = arr(data.finances);
  const invoices = arr(data.invoices);
  const documents = arr(data.documents);
  const opportunities = arr(data.sales_opportunities);
  const animals = arr(data.animaux);
  const health = arr(data.sante);

  const paymentsWithoutFinance = payments.filter((payment) => {
    const paymentId = String(payment.id || '');
    const orderId = linkedId(payment);
    const paid = amount(payment);
    return paid > 0 && !finances.some((f) => {
      const samePayment = paymentId && String(f.payment_id || '') === paymentId;
      const sameOrder = orderId && linkedId(f) === orderId && Math.abs(amount(f) - paid) < 1;
      return samePayment || sameOrder;
    });
  });
  if (paymentsWithoutFinance.length) addFinding(findings, {
    module: 'Ventes', zone: 'Paiements', element: `${paymentsWithoutFinance.length} paiement(s)`, type: 'workflow', severity: 'bloquant', status: 'detecte',
    title: 'Paiements sans transaction Finance liée', detail: `${paymentsWithoutFinance.length} paiement(s) existent sans écriture Finance retrouvée.`,
    probable_cause: 'Paiement créé par un chemin qui ne passe pas par le workflow vente complet ou ancienne donnée non synchronisée.', expected_fix: 'Centraliser paiement → création Finance automatique sans doublon.',
    business_impact: 'CA, trésorerie, comptabilité, objectifs et accueil peuvent être faux.', linked_modules: ['Ventes', 'Finances', 'Comptabilité', 'Objectifs', 'Accueil'],
    source_path: 'src/modules/VentesV2.jsx', source_component: 'PaymentCapturePanel / commitSaleWorkflow', correction_lot: 'Lot 1 · Fiabilité financière et CA',
    retest_steps: ['Créer un paiement', 'Vérifier la transaction dans Finances', 'Vérifier Comptabilité/Objectifs/Accueil'],
  });

  const invoicesWithoutDocument = invoices.filter((invoice) => {
    const invoiceId = String(invoice.id || '');
    const orderId = String(invoice.order_id || invoice.sale_id || invoice.related_id || '');
    return !documents.some((doc) => String(doc.invoice_id || '') === invoiceId || String(doc.related_id || doc.entity_id || '') === invoiceId || (orderId && String(doc.order_id || doc.sale_id || doc.related_id || '') === orderId));
  });
  if (invoicesWithoutDocument.length) addFinding(findings, {
    module: 'Documents', zone: 'Factures', element: `${invoicesWithoutDocument.length} facture(s)`, type: 'document', severity: 'critique', status: 'detecte',
    title: 'Factures sans document associé', detail: `${invoicesWithoutDocument.length} facture(s) ne sont pas retrouvables comme document.`,
    probable_cause: 'Création facture non suivie par création Document ou liens invoice_id/order_id incomplets.', expected_fix: 'Facture créée → Document facture créé automatiquement.',
    business_impact: 'Traçabilité et preuve commerciale incomplètes.', linked_modules: ['Ventes', 'Documents', 'Comptabilité', 'Clients'],
    source_path: 'src/services/workflowService.js', source_component: 'commitSaleWorkflow', correction_lot: 'Lot 1 · Fiabilité financière et CA',
    retest_steps: ['Créer une facture', 'Ouvrir Documents', 'Vérifier document facture lié'],
  });

  const openConvertedOpps = opportunities.filter((opp) => {
    const oppId = String(opp.id || '');
    const sourceId = String(opp.source_id || opp.related_id || opp.entity_id || '');
    const hasOrder = orders.some((order) => String(order.opportunity_id || order.source_opportunity_id || order.converted_opportunity_id || '') === oppId || (sourceId && String(order.source_id || order.related_id || order.entity_id || '') === sourceId));
    return hasOrder && !/converti|convertie|ferme|fermée|cloture|clôture|commande/.test(clean(opp.status || opp.statut || opp.etat));
  });
  if (openConvertedOpps.length) addFinding(findings, {
    module: 'Ventes', zone: 'Opportunités', element: `${openConvertedOpps.length} opportunité(s)`, type: 'workflow', severity: 'critique', status: 'detecte',
    title: 'Opportunités converties mais encore ouvertes', detail: `${openConvertedOpps.length} opportunité(s) ont une commande liée mais restent ouvertes.`,
    probable_cause: 'Commande créée sans fermer l’opportunité ou ancienne donnée non migrée.', expected_fix: 'Commande depuis opportunité → opportunité automatiquement convertie/fermée.',
    business_impact: 'Le centre décisionnel peut proposer des actions déjà faites et créer des doublons.', linked_modules: ['Ventes', 'Centre décisionnel', 'Traçabilité'],
    source_path: 'src/modules/SalesOpportunitiesBridge.jsx', source_component: 'createOrderFromOpportunity', correction_lot: 'Lot 2 · Workflows métier interconnectés',
    retest_steps: ['Convertir une opportunité', 'Vérifier qu’elle disparaît des opportunités actives', 'Vérifier converted_order_id'],
  });

  const soldAnimalsNoOrder = animals.filter((animal) => /vendu|vendue/.test(clean(animal.status || animal.statut)) && !animal.sale_order_id && !animal.commande_id && !animal.vente_id).length;
  if (soldAnimalsNoOrder) addFinding(findings, {
    module: 'Animaux', zone: 'Fiche animal vendu', element: `${soldAnimalsNoOrder} animal(aux)`, type: 'workflow', severity: 'critique', status: 'detecte',
    title: 'Animaux vendus sans commande liée', detail: `${soldAnimalsNoOrder} animal(aux) sont vendus sans lien commande/vente visible.`,
    probable_cause: 'Statut animal modifié sans passer par la vente ou lien vente non sauvegardé.', expected_fix: 'Animal vendu → commande/paiement/finance liés + animal verrouillé.',
    business_impact: 'Marge, historique, traçabilité et CA animaux peuvent être faux.', linked_modules: ['Animaux', 'Ventes', 'Finances', 'Traçabilité', 'Objectifs'],
    source_path: 'src/services/saleAssetPatchService.js', source_component: 'buildSaleAssetPatch', correction_lot: 'Lot 2 · Workflows métier interconnectés',
    retest_steps: ['Vendre un animal', 'Vérifier lien commande', 'Vérifier verrouillage fiche animal'],
  });

  const healthFreeImpact = health.filter((row) => (row.impact_business || row.impact_ferme) && !row.impact_business_category && !row.impact_category && !row.impact_structured).length;
  if (healthFreeImpact) addFinding(findings, {
    module: 'Impact Business', zone: 'Interventions santé', element: `${healthFreeImpact} impact(s)`, type: 'champ', severity: 'majeur', status: 'detecte',
    title: 'Impact ferme encore en champ libre', detail: `${healthFreeImpact} intervention(s) santé ont un impact non structuré.`,
    probable_cause: 'Impact Business saisi comme texte libre au lieu de catégorie/niveau/montant/action.', expected_fix: 'Remplacer par type + niveau + montant + action recommandée + commentaire libre optionnel.',
    business_impact: 'Impossible de filtrer, calculer ou prioriser correctement l’impact ferme.', linked_modules: ['Santé', 'Impact Business', 'Finances', 'Centre décisionnel'],
    source_path: 'src/modules/SanteV2.jsx', source_component: 'Health intervention form', correction_lot: 'Lot 4 · Formulaires et champs',
    retest_steps: ['Créer une intervention santé', 'Vérifier champs impact structurés', 'Vérifier Impact Business'],
  });

  const animalSales = orders.filter(isAnimalSale).reduce((sum, row) => sum + amount(row), 0) + finances.filter((row) => isAnimalSale(row) && isFinanceRevenue(row)).reduce((sum, row) => sum + amount(row), 0);
  const avicoleSales = orders.filter(isAvicoleSale).reduce((sum, row) => sum + amount(row), 0) + finances.filter((row) => isAvicoleSale(row) && isFinanceRevenue(row)).reduce((sum, row) => sum + amount(row), 0);
  const cultureSales = orders.filter(isCultureSale).reduce((sum, row) => sum + amount(row), 0) + finances.filter((row) => isCultureSale(row) && isFinanceRevenue(row)).reduce((sum, row) => sum + amount(row), 0);
  if (orders.some(isAnimalSale) && animalSales <= 0) addFinding(findings, { module: 'Objectifs', zone: 'Réalisé animaux', element: 'CA animaux', type: 'donnee', severity: 'bloquant', title: 'CA animaux non reconnu malgré ventes', detail: 'Des ventes animaux existent mais le réalisé animaux reste à zéro ou non attribué.', probable_cause: 'Mapping source_type/source_id/activité incomplet.', expected_fix: 'Normaliser activité ventes/finances pour alimenter Objectifs.', business_impact: 'Objectifs et pilotage financier faux.', linked_modules: ['Animaux', 'Ventes', 'Finances', 'Objectifs'], correction_lot: 'Lot 1 · Fiabilité financière et CA' });
  if (orders.some(isAvicoleSale) && avicoleSales <= 0) addFinding(findings, { module: 'Objectifs', zone: 'Réalisé avicole', element: 'CA avicole', type: 'donnee', severity: 'bloquant', title: 'CA avicole non reconnu malgré ventes', detail: 'Des ventes avicoles existent mais le réalisé avicole reste à zéro ou non attribué.', probable_cause: 'Mapping produits chair/œufs/pondeuses incomplet.', expected_fix: 'Normaliser activité avicole dans ventes/finances/objectifs.', business_impact: 'Objectifs avicoles et marges faussés.', linked_modules: ['Avicole', 'Ventes', 'Finances', 'Objectifs'], correction_lot: 'Lot 1 · Fiabilité financière et CA' });
  if (orders.some(isCultureSale) && cultureSales <= 0) addFinding(findings, { module: 'Objectifs', zone: 'Réalisé cultures', element: 'CA cultures', type: 'donnee', severity: 'bloquant', title: 'CA cultures non reconnu malgré ventes', detail: 'Des ventes cultures existent mais le réalisé cultures reste à zéro ou non attribué.', probable_cause: 'Mapping cultures/récoltes incomplet.', expected_fix: 'Normaliser activité cultures dans ventes/finances/objectifs.', business_impact: 'Objectifs cultures et CA agricole faussés.', linked_modules: ['Cultures', 'Ventes', 'Finances', 'Objectifs'], correction_lot: 'Lot 1 · Fiabilité financière et CA' });

  if (finances.length && !finances.some(isExpense)) addFinding(findings, {
    module: 'Comptabilité', zone: 'Charges', element: 'Charges exploitation', type: 'donnee', severity: 'bloquant', status: 'detecte',
    title: 'Charges non visibles en comptabilité', detail: 'Aucune charge exploitable détectée dans les finances.',
    probable_cause: 'Coûts santé/alimentation/RH/investissements non synchronisés en finances ou mal catégorisés.', expected_fix: 'Synchroniser les coûts métier vers Finances puis Comptabilité.',
    business_impact: 'Marge et résultat artificiellement trop élevés.', linked_modules: ['Finances', 'Comptabilité', 'Animaux', 'Avicole', 'Cultures', 'Santé'], correction_lot: 'Lot 1 · Fiabilité financière et CA',
    retest_steps: ['Vérifier charges Finances', 'Vérifier Comptabilité', 'Comparer marges'],
  });

  const missingCentralData = auditManifest.flatMap((manifest) => arr(manifest.data).filter((key) => key && Object.prototype.hasOwnProperty.call(data, key) && !arr(data[key]).length).map((key) => normalizeAuditFinding({
    module: manifest.module, zone: 'Données module', element: key, type: 'donnee', severity: ['Finances', 'Comptabilité', 'Ventes'].includes(manifest.module) ? 'critique' : 'majeur', status: 'detecte',
    title: `Données ${key} absentes`, detail: `Le référentiel demande ${key} pour auditer ${manifest.module}, mais aucune ligne n’est chargée.`,
    probable_cause: 'Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.', expected_fix: 'Vérifier alimentation du module et cohérence données simulées/réelles.',
    business_impact: 'Audit incomplet ou lecture métier partielle.', linked_modules: [manifest.module], correction_lot: 'Lot 5 · UI/données/audit',
  })));

  return sortAuditFindings([...findings, ...missingCentralData]);
}

function buildMarkdown(roadmap) {
  const lines = [
    '# Feuille de route audit ERP Horizon Farm',
    '',
    `- Générée le : ${roadmap.generated_at}`,
    `- Modules audités : ${roadmap.modules_audited}`,
    `- Anomalies détectées : ${roadmap.findings_count}`,
    `- Points de contrôle : ${roadmap.coverage_stats?.control_points || 0}`,
    `- Éléments à inspecter : ${roadmap.coverage_stats?.total_inspection_items || 0}`,
    `- Formulaires : ${roadmap.coverage_stats?.forms || 0}`,
    `- Cartes/KPI : ${roadmap.coverage_stats?.cards || 0}`,
    `- Tableaux : ${roadmap.coverage_stats?.tables || 0}`,
    `- Graphiques : ${roadmap.coverage_stats?.charts || 0}`,
    `- Workflows : ${roadmap.coverage_stats?.workflows || 0}`,
    '',
    '## Synthèse par priorité',
    '',
  ];

  roadmap.priority_summary.forEach((item) => lines.push(`- P${item.priority} · ${item.title} : ${item.count} anomalie(s)`));
  lines.push('', '## Couverture inspection par module', '');
  arr(roadmap.inspection_coverage).forEach((module) => {
    lines.push(`### ${module.module}`);
    lines.push(`- Route : ${module.route || '—'}`);
    lines.push(`- Dimensions : ${arr(module.dimensions).map((dimension) => dimension.title).join(', ') || '—'}`);
    lines.push(`- Cartes : ${module.counts?.cards || 0}, Tableaux : ${module.counts?.tables || 0}, Graphiques : ${module.counts?.charts || 0}, Formulaires : ${module.counts?.forms || 0}, Workflows : ${module.counts?.workflows || 0}, Simplification : ${module.counts?.simplification || 0}`);
    arr(module.inspection_items).slice(0, 12).forEach((item) => lines.push(`  - [${item.type}] ${item.element} · ${item.expected}`));
    if (arr(module.inspection_items).length > 12) lines.push(`  - ... ${arr(module.inspection_items).length - 12} autre(s) élément(s) à inspecter`);
    lines.push('');
  });
  lines.push('', '## Anomalies détaillées', '');
  roadmap.findings.forEach((finding, index) => {
    lines.push(`### ${index + 1}. [${finding.severity}] ${finding.module} · ${finding.title}`);
    lines.push(`- Zone : ${finding.zone}`);
    lines.push(`- Élément : ${finding.element}`);
    lines.push(`- Type : ${finding.type}`);
    lines.push(`- Cause probable : ${finding.probable_cause}`);
    lines.push(`- Correction attendue : ${finding.expected_fix}`);
    lines.push(`- Impact métier : ${finding.business_impact}`);
    lines.push(`- Modules liés : ${arr(finding.linked_modules).join(', ') || '—'}`);
    if (finding.source_path) lines.push(`- Fichier probable : ${finding.source_path}${finding.source_component ? ` · ${finding.source_component}` : ''}`);
    if (arr(finding.retest_steps).length) lines.push(`- Retest : ${arr(finding.retest_steps).join(' > ')}`);
    lines.push('');
  });
  return lines.join('\n');
}

async function writeRoadmap(payload) {
  const response = await fetch('/api/erp-agent/write-audit-roadmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || `Erreur GitHub ${response.status}`);
  return result;
}

export default function GitHubAuditRoadmapPanel() {
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const keys = Array.from(new Set([...auditRequiredDataKeys, 'invoices', 'documents', 'sales_opportunities', 'payments', 'finances', 'sales_orders', 'animaux', 'avicole', 'cultures', 'sante']));
  const crud = Object.fromEntries(keys.map((key) => [key, useCrudModule(key)]));
  const data = Object.fromEntries(keys.map((key) => [key, arr(crud[key]?.rows)]));
  const modulesAudited = auditManifest.length;
  const findings = useMemo(() => buildFindings(data), [JSON.stringify(data)]);
  const inspectionCoverage = useMemo(() => buildAuditInspectionCoverage(), []);
  const coverageStats = useMemo(() => buildAuditCoverageStats(inspectionCoverage), [inspectionCoverage]);

  const generate = async () => {
    if (busy) return;
    try {
      setBusy(true);
      await Promise.allSettled(keys.map((key) => crud[key]?.refresh?.()));
      const generatedAt = new Date().toISOString();
      const latestData = Object.fromEntries(keys.map((key) => [key, arr(crud[key]?.rows)]));
      const latestFindings = buildFindings(latestData);
      const latestCoverage = buildAuditInspectionCoverage();
      const latestCoverageStats = buildAuditCoverageStats(latestCoverage);
      const inspectionBacklog = buildAuditInspectionBacklog(latestCoverage);
      const prioritySummary = [1, 2, 3, 4, 5, 6].map((priority) => ({
        priority,
        title: priority === 1 ? 'Fiabilité financière et chiffre d’affaires'
          : priority === 2 ? 'Workflows métier interconnectés'
            : priority === 3 ? 'Règles terrain critiques'
              : priority === 4 ? 'Formulaires et champs'
                : priority === 5 ? 'UI, tableaux, cartes et graphes'
                  : 'Simplification intelligente',
        count: latestFindings.filter((finding) => String(finding.correction_lot || '').includes(`Lot ${priority}`) || finding.severity_rank === priority).length,
      }));
      const roadmap = {
        generated_at: generatedAt,
        modules_audited: modulesAudited,
        findings_count: latestFindings.length,
        coverage_stats: latestCoverageStats,
        audit_scope: auditManifest.map((manifest) => ({ module: manifest.module, route: manifest.route, deep_focus: getDeepAuditFocus(manifest.module).map((item) => item.title) })),
        inspection_coverage: latestCoverage,
        inspection_backlog: inspectionBacklog,
        priority_summary: prioritySummary,
        findings: latestFindings,
      };
      const markdown = buildMarkdown(roadmap);
      const result = await writeRoadmap({ roadmap, markdown, modulesAudited, findingsCount: latestFindings.length });
      setLastResult(result);
      toast.success(`Feuille de route générée : ${result.modulesAudited} module(s) audité(s)`);
    } catch (error) {
      toast.error(error.message || 'Génération impossible');
      setLastResult({ ok: false, error: error.message });
    } finally {
      setBusy(false);
    }
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><GitBranch size={14} /> Audit vers GitHub</p>
        <h2 className="mt-3 text-2xl font-black text-[#2f2415]">Générer la feuille de route d’audit</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Un clic génère les fichiers GitHub que je pourrai relire pour corriger par priorité. Aucune correction directe n’est appliquée depuis l’ERP.</p>
      </div>
      <button type="button" onClick={generate} disabled={busy} className="rounded-xl bg-[#2f2415] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
        {busy ? <RefreshCw size={14} className="inline animate-spin" /> : <FileJson size={14} className="inline" />} Générer feuille de route GitHub
      </button>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <Mini label="Modules" value={modulesAudited} />
      <Mini label="Anomalies" value={findings.length} danger={findings.length > 0} />
      <Mini label="Formulaires" value={coverageStats.forms} />
      <Mini label="Cartes/KPI" value={coverageStats.cards} />
      <Mini label="Tableaux" value={coverageStats.tables} />
      <Mini label="Graphiques" value={coverageStats.charts} />
    </div>

    {lastResult ? <div className={`rounded-2xl border p-4 text-sm ${lastResult.ok === false ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
      {lastResult.ok === false ? <><b>Erreur :</b> {lastResult.error}</> : <><b>Fichier généré :</b> {lastResult.modulesAudited} module(s) audité(s), {lastResult.findingsCount} anomalie(s), {coverageStats.total_inspection_items} élément(s) à inspecter. Chemins : docs/audit-results/current/audit-roadmap.json et .md.</>}
    </div> : null}
  </section>;
}

function Mini({ label, value, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="text-xs uppercase tracking-wide text-[#8a7456]">{label}</p>
    <p className={`mt-2 text-xl font-black ${danger ? 'text-amber-700' : 'text-[#2f2415]'}`}>{value}</p>
  </div>;
}
