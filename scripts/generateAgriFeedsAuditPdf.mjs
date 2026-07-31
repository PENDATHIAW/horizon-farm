/**
 * Génère le PDF Audit + Plan AGRI FEEDS (Horizon Farm).
 * Usage: node scripts/generateAgriFeedsAuditPdf.mjs
 */
import { jsPDF } from 'jspdf';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.AGRI_FEEDS_PDF_OUT
  || join('/opt/cursor/artifacts', 'AGRI_FEEDS_Audit_Plan_Implementation.pdf');

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 287;

function createDoc() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;
  let page = 1;

  const ensure = (need = 8) => {
    if (y + need > FOOTER_Y - 6) {
      footer();
      doc.addPage();
      page += 1;
      y = MARGIN;
    }
  };

  const footer = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 100, 70);
    doc.text(
      `Horizon Farm · AGRI FEEDS — Audit & Plan · ${page}`,
      PAGE_W / 2,
      FOOTER_Y,
      { align: 'center' },
    );
  };

  const h1 = (text) => {
    ensure(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(35, 55, 30);
    doc.text(text, MARGIN, y);
    y += 9;
    doc.setDrawColor(70, 110, 55);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y - 4, MARGIN + 60, y - 4);
  };

  const h2 = (text) => {
    ensure(12);
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(45, 70, 40);
    doc.text(text, MARGIN, y);
    y += 7;
  };

  const h3 = (text) => {
    ensure(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(55, 80, 45);
    doc.text(text, MARGIN, y);
    y += 6;
  };

  const p = (text, opts = {}) => {
    const size = opts.size || 9.5;
    const indent = opts.indent || 0;
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(40, 35, 28);
    const lines = doc.splitTextToSize(text, CONTENT_W - indent);
    lines.forEach((line) => {
      ensure(5.2);
      doc.text(line, MARGIN + indent, y);
      y += 4.6;
    });
    if (opts.gapAfter) y += opts.gapAfter;
  };

  const bullet = (text) => {
    const lines = doc.splitTextToSize(text, CONTENT_W - 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(40, 35, 28);
    lines.forEach((line, i) => {
      ensure(5.2);
      if (i === 0) doc.text('•', MARGIN, y);
      doc.text(line, MARGIN + 5, y);
      y += 4.6;
    });
  };

  const kv = (key, value) => {
    ensure(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(50, 70, 40);
    const keyW = Math.min(55, doc.getTextWidth(`${key} `) + 2);
    doc.text(key, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 35, 28);
    const lines = doc.splitTextToSize(String(value), CONTENT_W - keyW);
    lines.forEach((line, i) => {
      if (i > 0) ensure(5);
      doc.text(line, MARGIN + keyW, y);
      y += 4.5;
    });
  };

  /** Simple table: rows = array of string arrays */
  const table = (headers, rows, colWeights) => {
    const cols = headers.length;
    const weights = colWeights || headers.map(() => 1);
    const sumW = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((w) => (CONTENT_W * w) / sumW);
    const drawRow = (cells, header = false) => {
      const cellLines = cells.map((c, i) => doc.splitTextToSize(String(c ?? ''), widths[i] - 3));
      const maxLines = Math.max(...cellLines.map((l) => l.length), 1);
      const rowH = maxLines * 4.2 + 3;
      ensure(rowH + 1);
      if (header) {
        doc.setFillColor(232, 240, 228);
        doc.rect(MARGIN, y - 3.5, CONTENT_W, rowH, 'F');
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.setFontSize(8);
      doc.setTextColor(35, 35, 30);
      let x = MARGIN;
      for (let i = 0; i < cols; i += 1) {
        cellLines[i].forEach((line, li) => {
          doc.text(line, x + 1.5, y + li * 4.2);
        });
        x += widths[i];
      }
      doc.setDrawColor(210, 200, 180);
      doc.setLineWidth(0.15);
      doc.line(MARGIN, y - 3.5 + rowH, MARGIN + CONTENT_W, y - 3.5 + rowH);
      y += rowH;
    };
    drawRow(headers, true);
    rows.forEach((r) => drawRow(r, false));
    y += 2;
  };

  const box = (title, bodyLines) => {
    const lines = [];
    bodyLines.forEach((t) => {
      lines.push(...doc.splitTextToSize(t, CONTENT_W - 8));
    });
    const h = 8 + lines.length * 4.4 + 4;
    ensure(h);
    doc.setFillColor(248, 250, 245);
    doc.setDrawColor(120, 150, 100);
    doc.roundedRect(MARGIN, y - 3, CONTENT_W, h, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(40, 70, 35);
    doc.text(title, MARGIN + 4, y + 2);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(45, 40, 32);
    lines.forEach((line) => {
      doc.text(line, MARGIN + 4, y);
      y += 4.4;
    });
    y += 6;
  };

  const cover = () => {
    doc.setFillColor(45, 75, 40);
    doc.rect(0, 0, PAGE_W, 70, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('HORIZON FARM', MARGIN, 28);
    doc.setFontSize(14);
    doc.text('AGRI FEEDS — Audit de l’existant & Plan d’implémentation', MARGIN, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Document interne — architecture ERP agricole data-driven', MARGIN, 52);
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}`, MARGIN, 60);

    y = 85;
    doc.setTextColor(40, 35, 28);
    h2('Objet du document');
    p('Ce document synthétise l’audit du code Horizon Farm et le plan d’implémentation proposé pour AGRI FEEDS (Phase 2 — production d’aliments animaux), sans créer d’architecture parallèle. Aucune modification de code n’a encore été réalisée pour AGRI FEEDS.');
    y += 3;
    box('Positionnement', [
      'Phase 1 — Horizon Farm : achat d’aliments du marché + collecte de référence.',
      'Phase 2A — AGRI FEEDS pilote : matières premières → formules → production → tests internes.',
      'Phase 2B — Vente progressive : uniquement formules validées en interne.',
      'Tallow & Go / BOVINIA restent des valorisations de coproduits distinctes.',
    ]);
    p('Lieu d’implantation (Thiès / Dokhoba) : à décider — prévu comme paramètre de zone site, non bloquant pour le socle ERP.');
    footer();
  };

  return {
    doc, get y() { return y; }, set y(v) { y = v; }, ensure, footer, h1, h2, h3, p, bullet, kv, table, box, cover,
    finish() {
      footer();
      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i += 1) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 100, 70);
        doc.text(
          `Horizon Farm · AGRI FEEDS — Audit & Plan · ${i}/${total}`,
          PAGE_W / 2,
          FOOTER_Y,
          { align: 'center' },
        );
      }
    },
  };
}

function build() {
  const d = createDoc();
  d.cover();
  d.doc.addPage();
  d.y = MARGIN;

  // ——— 1 AUDIT ———
  d.h1('1. Audit de l’existant');

  d.h2('1.1 Stack & structure');
  d.bullet('Frontend : React 19, Vite 8, Tailwind CSS 4, Lucide');
  d.bullet('Données : Supabase (@supabase/supabase-js) + file offline');
  d.bullet('Export : jsPDF, xlsx — Tests : Node test, vite-node, Playwright');
  d.bullet('Dossiers clés : src/modules, src/services, src/utils, src/config, supabase/, tests/, docs/');

  d.h2('1.2 Navigation & modules');
  d.p('Registre central : src/config/modules.config.js (MODULE_REGISTRY, NAV_MODULE_ORDER, CRUD_KEYS).');
  d.p('Onglets canoniques : src/config/horizonVision.config.js → MODULE_TARGET_TABS.');
  d.p('Point d’entrée App : src/App.jsx + moduleEntryPoints.js.');
  d.y += 1;
  d.table(
    ['Clé module', 'Libellé'],
    [
      ['dashboard', 'Accueil'],
      ['assistant_erp', 'Assistant ERP'],
      ['centre_ia', 'Centre décisionnel'],
      ['objectifs_croissance', 'Objectifs & Croissance'],
      ['investisseurs_forums', 'Investisseurs & Forums'],
      ['elevage', 'Élevage'],
      ['cultures', 'Cultures'],
      ['commercial', 'Commercial'],
      ['achats_stock', 'Achats & Stock'],
      ['finance_pilotage', 'Finance & Pilotage'],
      ['activite_suivi', 'Activité & Suivi'],
      ['documents_rapports', 'Documents & Rapports'],
      ['rh', 'Opérations & Ressources'],
      ['equipements', 'Équipements'],
      ['smartfarm', 'Smart Farm'],
      ['sync_activity', 'Activité & Sync ERP'],
      ['gestion_systeme', 'Gestion du système'],
    ],
    [1, 2],
  );
  d.p('Écart : aucun module agri_feeds / usine d’aliments dans le registre ou la navigation.');

  d.h2('1.3 Couche données');
  d.bullet('Schémas formulaires : MODULE_FORM_FIELDS / MODULE_CONFIG dans src/utils/constants.js');
  d.bullet('DDL Supabase : supabase/horizon_farm_prod_schema.sql + migrations/');
  d.bullet('État app : AppContext (serviceMap / dataMap) + useCrudModule(s)');
  d.bullet('Collections utiles : animaux, avicole (lots), stock, stock_movements, fournisseurs, finances, clients, sales_orders, alimentation_logs, production_oeufs_logs, alertes_center, taches, documents, business_events, equipements');
  d.p('Écart : pas de tables formulations, BOM, OF, lots produits AGRI FEEDS, essais, QC dédiés.');

  d.h2('1.4 Ce qui existe déjà pour l’alimentation');
  d.table(
    ['Capacité', 'Statut', 'Ancrage'],
    [
      ['Achat aliment → stock', 'Existe', 'stockPurchaseWorkflow.js'],
      ['Distribution → élevage', 'Existe', 'commitElevageFeeding + alimentation_logs'],
      ['Coût alimentaire lot/animal', 'Existe', 'costEngine.js, alimentation_*_view'],
      ['Mortalité / pesée / ponte', 'Existe', 'workflows élevage'],
      ['Fournisseurs & dettes', 'Existe', 'Achats & Stock'],
      ['Ventes & clients', 'Existe', 'commercialSaleWorkflow.js'],
      ['Alertes / Centre / Assistant', 'Existe', 'engines branchables'],
      ['Readiness « quand lancer »', 'Pattern', 'valorisationReadinessEngine.js'],
      ['Formulations / OF / lots PF', 'Absent', '—'],
      ['Benchmark Phase 1 vs AGRI FEEDS', 'Absent', '—'],
      ['Zones site AGRI FEEDS', 'Absent', 'zones IoT libres seulement'],
      ['FIFO matières', 'Absent', 'CMUP uniquement'],
    ],
    [2.2, 1, 2.2],
  );

  d.h2('1.5 Élevage — détail');
  d.bullet('Shell : ElevageRecoveredModule.jsx — onglets Lots & bandes, Cycles & Reproduction, Santé, Transformation');
  d.bullet('Avicole (lots) vs Animaux (bovin/ovin/caprin) — actions rapides Aliment, Ponte, Pesée, Mortalité, Vente');
  d.bullet('Alimentation : alimentation_logs + sortie stock + finance catégorie Alimentation');
  d.bullet('Si logs absents : estimations FEEDING_DEFAULTS (coût « estimé »)');
  d.bullet('Alias navigation « Alimentation » → onglet Lots & bandes (pas un module usine)');

  d.h2('1.6 Achats & Stock');
  d.bullet('Onglets : Inventaire, Réceptions & achats, Fournisseurs & dettes');
  d.bullet('Achat canonique : prepare/commitStockPurchaseWorkflow → stock + mouvement + finance + dette + alerte seuil');
  d.bullet('Catégories aliment actuelles : aliment_betail, aliment_avicole (achetés, pas produits)');
  d.bullet('Valorisation stock : CMUP (pas FIFO par lot matière)');
  d.bullet('Analogie production la plus proche : CulturesTransformationPanel (intrant → produit fini)');

  d.h2('1.7 Commercial & Finance');
  d.bullet('Vente : commitCommercialSaleWorkflow — source_type stock | animal | lot_avicole | culture | service | autre');
  d.bullet('Produits : pas de master produit rigide — lignes libres + stock sellable (isSellableStock)');
  d.bullet('Aujourd’hui, catégorie aliment souvent non sellable en commercial — à traiter proprement pour AGRI FEEDS validé');
  d.bullet('Finance : sorties Stock / Alimentation ; entrées ventes ; créances clients');

  d.h2('1.8 Centre décisionnel, Alertes, IA');
  d.bullet('Centre : CentreDecisionModule + growthDecisionEngine / strategicDecisionEngine');
  d.bullet('Alertes : alertes_center, erpHealthEngine, strategicAlertBridge, Smart Farm sync');
  d.bullet('Assistant : heyHorizonAssistantService, aiIntentEngine, prompts module (finance/commercial/stratégique)');
  d.bullet('Pattern Greenpreneurs : score + blockers + nextActions + bestMoment (réutilisable pour readiness AGRI FEEDS)');
  d.p('Écart : aucun intent / prompt / alerte dédiés production d’aliments.');

  d.h2('1.9 Auth & rôles');
  d.bullet('Rôles : admin, manager, employe, veterinaire, comptable, visiteur');
  d.bullet('Permissions modules : AuthContext + module_role_permissions (Supabase)');
  d.p('Écart : pas de rôle Responsable AGRI FEEDS ni permissions validation formule.');

  d.h2('1.10 Infrastructures / site');
  d.p('Pas de module bâtiments / plan de site. Zones libres sur capteurs Smart Farm ; champs bâtiment optionnels sur lots ; investissements BP « infrastructure ». Les zones AGRI FEEDS (stock MP, machines, PF, QC, chargement) sont à créer.');

  d.h2('1.11 Conventions formulaires & tests');
  d.bullet('CRUD générique : GenericCrudModule + MODULE_FORM_FIELDS');
  d.bullet('Workflows métier : formulaires dédiés (StockPurchaseReceptionForm, ElevageWorkflowPanels)');
  d.bullet('Tests : tests/unit/*.test.js, tests/e2e/*.spec.js — scripts npm par domaine');
  d.p('Pour AGRI FEEDS : workflows commit dédiés + tests unitaires (pas seulement CRUD générique).');

  // ——— 2 PLAN ———
  d.h1('2. Plan d’implémentation');

  d.h2('2.1 Principes');
  d.bullet('Pas de 20 sous-modules isolés — un grand module agri_feeds avec onglets regroupés');
  d.bullet('Réutiliser fournisseurs, clients, ventes, alimentation_logs, stock, finance, équipements');
  d.bullet('Interconnexions et automatisations avant saisie manuelle');
  d.bullet('IA sobre : propose, humain valide — fallback rule-based sans clé API');
  d.bullet('Interdiction de commercialiser une formule non validée');

  d.h2('2.2 Fichiers à réutiliser');
  d.table(
    ['Besoin', 'Fichier / pattern'],
    [
      ['Achat matières premières', 'stockPurchaseWorkflow.js + StockPurchaseReceptionForm'],
      ['Sortie vers animaux', 'elevageWorkflow.js → commitElevageFeeding'],
      ['Transformation MP → PF', 'CulturesTransformationPanel (pattern)'],
      ['Ventes', 'commercialSaleWorkflow.js + isSellableStock'],
      ['Readiness phase', 'valorisationReadinessEngine.js (clone pattern)'],
      ['Centre / alertes', 'buildGreenpreneursCentreAlerts + strategicAlertBridge'],
      ['Assistant', 'heyHorizonAssistantService + aiIntentEngine'],
      ['Forms', 'MODULE_FORM_FIELDS + formulaires workflow'],
      ['Rôles', 'AuthContext + module_role_permissions'],
    ],
    [1.4, 2.6],
  );

  d.h2('2.3 Nouveaux fichiers (cœur)');
  d.p('src/config/agriFeeds.config.js');
  d.p('src/services/agriFeeds/');
  d.bullet('agriFeedsReadinessEngine.js — Mode 1 / 2A / 2B');
  d.bullet('phase1FeedBenchmarkEngine.js — référence aliments marché');
  d.bullet('formulaLifecycleService.js — statuts + garde-fous');
  d.bullet('feedCostEngine.js — coût théorique / réel /kg');
  d.bullet('feedProductionWorkflow.js — OF → conso MP → lot fini');
  d.bullet('feedTrialEngine.js — tests + comparaison');
  d.bullet('feedDecisionEngine.js — décisions Centre');
  d.bullet('agriFeedsAiService.js — rule-based + LLM optionnel');
  d.p('src/modules/AgriFeedsModule.jsx + src/modules/agriFeeds/tabs/…');
  d.p('supabase/migrations/…_agri_feeds.sql');
  d.p('tests/unit/agriFeeds*.test.js');
  d.p('docs/rapports/AGRI_FEEDS_LOGIC.md');

  d.h2('2.4 Enrichissements (sans doublons)');
  d.table(
    ['Existant', 'Enrichissement'],
    [
      ['stockCategoryOptions.js', 'matiere_premiere_aliment, aliment_agri_feeds, emballage_aliment, echantillon_temoin'],
      ['fournisseurs', 'supplier_type (marché / MP / emballage / mixte)'],
      ['clients', 'type éleveur + score réachat'],
      ['alimentation_logs', 'feed_source, formula_version_id, finished_batch_id'],
      ['equipements', 'types machines AGRI FEEDS'],
      ['CRUD_KEYS / AppContext', 'collections formules / OF / lots / essais'],
      ['ROLE_PERMISSIONS', 'module agri_feeds + actions sensibles'],
      ['INTERCONNECTIONS', 'flux production, essai, vente AGRI FEEDS'],
    ],
    [1.5, 2.5],
  );

  d.h2('2.5 Onglets UI (20 besoins → 8 onglets)');
  d.table(
    ['Onglet', 'Couvre'],
    [
      ['Tableau de bord', 'KPI, Assistant, alertes, décisions'],
      ['Référence Phase 1', 'Benchmark aliments marché'],
      ['Matières & fournisseurs', 'MP, réceptions QC, fournisseurs'],
      ['Formulations', 'Formules, versions, ingrédients'],
      ['Production', 'OF, lots finis, stock PF, QR / traçabilité'],
      ['Tests & comparaison', 'Essais animaux + perf vs Phase 1'],
      ['Commercial', 'Ventes validées, clients, réachats, feedback'],
      ['Qualité & reporting', 'QC, traçabilité, rapports, zones site'],
    ],
    [1.4, 2.6],
  );

  d.h2('2.6 Modèles de données proposés');
  d.p('Tables Supabase (snake_case, conventions projet) :');
  d.bullet('feed_raw_materials, feed_raw_batches');
  d.bullet('feed_formulas, feed_formula_versions, feed_formula_ingredients');
  d.bullet('feed_production_orders, feed_finished_batches');
  d.bullet('feed_trials, feed_performance_snapshots');
  d.bullet('feed_quality_checks, feed_facility_zones');
  d.y += 1;
  d.p('Réutiliser (pas de tables parallèles) :');
  d.bullet('Fournisseurs → fournisseurs enrichi');
  d.bullet('Clients → clients enrichi');
  d.bullet('Ventes → sales_orders (stock aliment AGRI FEEDS validé)');
  d.bullet('Distributions → alimentation_logs enrichi');
  d.bullet('Machines → equipements');
  d.bullet('Finance / mouvements → finances + stock_movements + business_events');

  d.h2('2.7 Cycle de vie des formules');
  d.p('Brouillon → En test interne → À améliorer → Validée en interne → Test client limité → Commercialisable → Suspendue / Abandonnée');
  d.p('Bloquer « Commercialisable » si : aucun test interne terminé, aucun coût réel, aucune performance animale liée, aucune validation humaine, aucun QC minimum.');

  d.h2('2.8 Modes de déploiement');
  d.table(
    ['Mode', 'Autorisé', 'Interdit'],
    [
      ['1 — Référence', 'Achat marché, logs, zones prévues', 'OF, vente AGRI FEEDS'],
      ['2A — Pilote', 'MP, formules, production, tests internes', 'Vente large'],
      ['2B — Vente', 'Vente formules commercializables', 'Formule non validée'],
    ],
    [1.2, 1.6, 1.6],
  );

  d.h2('2.9 Flux métier cible');
  d.box('Chaîne relationnelle', [
    'Achats → stock MP → Formule → OF → lot fini → Stock PF',
    '→ Distribution (élevage) → FeedTrial → Comparaison Phase 1',
    '→ Validation humaine → Vente Commercial',
    '→ Finance + Alertes + Centre + Documents + Assistant',
  ]);

  d.h2('2.10 Interconnexions formulaires (automatisations)');
  d.bullet('Achat MP : matières habituelles, dernier prix, score qualité, délai, lieu stock');
  d.bullet('Réception : seuils QC, unité, coût total auto');
  d.bullet('Formulation : dernier prix, coût/100 kg, alerte expérimentale / stock / dérive coût');
  d.bullet('OF : ingrédients, quantités, stocks, FIFO proposé, coût théorique, code OF, réservation');
  d.bullet('Fin production : pertes, coût réel/kg, lot PF, stock, code lot, QR');
  d.bullet('Distribution : espèce/stade/effectif, aliments compatibles, qty théorique, sortie stock, coût lot');
  d.bullet('Essai : historique Phase 1 comparable, KPI, clôture, comparaison');
  d.bullet('Vente : historique client, formule habituelle, créances, marge, sortie PF, finance');
  d.bullet('Réachat : suggestion relance selon cycle et volume');

  d.h2('2.11 IA (sobre, décisionnelle)');
  d.bullet('Analyse formule, comparaison test, alertes prédictives, assistant commercial / fournisseur, synthèse mensuelle');
  d.bullet('Libellés UI : Analyse, Suggestion, Point d’attention, Décision proposée, À vérifier');
  d.bullet('Stockage réponse : date, données utilisées, conclusion, confiance, validation humaine');
  d.bullet('Fallback rule-based si pas de clé API — prompts internes jamais affichés');
  d.bullet('Données insuffisantes → message sobre, pas d’invention');

  d.h2('2.12 Validations métier');
  d.bullet('Matière rejetée → production bloquée');
  d.bullet('Stock insuffisant → OF bloqué');
  d.bullet('OF sans quantité réelle → clôture bloquée');
  d.bullet('Lot suspendu → vente bloquée');
  d.bullet('Formule non validée → commercialisation bloquée');
  d.bullet('Seuils configurables : écart coût réel/théorique, mortalité vs référence, conso anormale');

  d.h2('2.13 Permissions & audit');
  d.bullet('Rôles à ajouter / mapper : Responsable AGRI FEEDS, Technicien élevage, Commercial, Finance, Lecture financeur');
  d.bullet('Actions réservées : validation formule, statut commercializable, suppression lot, modif coût après clôture, clôture OF, annulation vente');
  d.bullet('Audit log : création/modif formule, validation, clôture production, ajustement stock, vente, réclamation, décision IA validée/rejetée');

  d.h2('2.14 Risques de régression');
  d.bullet('Casser commitElevageFeeding / achats stock en élargissant les catégories');
  d.bullet('Doubler fournisseurs / clients');
  d.bullet('Vendre un stock aliment non validé');
  d.bullet('Confusion Tallow/BOVINIA vs AGRI FEEDS dans le Centre');
  d.bullet('Sur-modélisation (20 CRUD) vs workflows réels');

  d.h2('2.15 Ordre de livraison recommandé');
  d.p('1. Config + readiness + zones prévues + benchmark Phase 1');
  d.p('2. MP / QC / formulations / coûts');
  d.p('3. OF + lots + stock PF + QR');
  d.p('4. Essais + comparaison + cycle de vie formule');
  d.p('5. Commercial + réachats + Centre / alertes / Assistant');
  d.p('6. Reporting + docs + permissions + audit log');

  d.h2('2.16 Plan de tests');
  d.table(
    ['#', 'Scénario'],
    [
      ['1', 'Achat MP → entrée stock + finance'],
      ['2', 'Formule → coût théorique'],
      ['3', 'OF → conso MP → lot fini + QR'],
      ['4', 'Distribution AGRI FEEDS → sortie stock + coût lot'],
      ['5', 'Essai → KPI + comparaison Phase 1'],
      ['6', 'Formule non validée → vente bloquée'],
      ['7', 'Matière rejetée → production bloquée'],
      ['8', 'Score readiness Mode 1 → 2A → 2B'],
      ['9', 'Tests unitaires workflows + smoke module'],
    ],
    [0.4, 3.6],
  );

  d.h1('3. Décisions ouvertes');
  d.bullet('Lieu : Thiès ou Dokhoba — paramètre de zone site, non bloquant pour le socle');
  d.bullet('Priorité Mode 1 (référence) d’abord vs socle complet 2A');
  d.bullet('Niveau de détail nutritionnel (protéines/énergie) en V1 ou plus tard');
  d.bullet('QR public : familles d’ingrédients seulement (pas la recette complète)');

  d.h1('4. Prochaine étape');
  d.p('Validation de ce plan par le porteur de projet, puis implémentation dans l’ordre de livraison §2.15, sur une branche dédiée cursor/…-ac42, sans architecture parallèle.');
  d.y += 4;
  d.box('Rappel', [
    'Objectif : AGRI FEEDS comme extension naturelle de Horizon Farm.',
    'Horizon Farm produit les données Phase 1 → AGRI FEEDS formule et produit →',
    'les animaux testent → l’ERP compare → l’IA propose → l’humain valide →',
    'seules les formules validées se commercialisent.',
  ]);

  d.finish();
  mkdirSync(dirname(OUT), { recursive: true });
  const buf = Buffer.from(d.doc.output('arraybuffer'));
  writeFileSync(OUT, buf);
  // Copie aussi dans docs/rapports pour le dépôt
  const repoCopy = join(__dirname, '..', 'docs', 'rapports', 'AGRI_FEEDS_Audit_Plan_Implementation.pdf');
  mkdirSync(dirname(repoCopy), { recursive: true });
  writeFileSync(repoCopy, buf);
  console.log(JSON.stringify({ out: OUT, repoCopy, bytes: buf.length, pages: d.doc.getNumberOfPages() }));
}

build();
