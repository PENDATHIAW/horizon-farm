/**
 * Génère les audits HTML Cultures, Commercial, Achats & Stock.
 * Usage: node scripts/generate-module-audits-html.mjs
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'rapports');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function htmlPage({ title, subtitle, score, sections }) {
  const body = sections.map((sec) => {
    const rows = (sec.rows || [])
      .map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2] || '')}</td></tr>`)
      .join('');
    const table = rows
      ? `<table><thead><tr><th>Élément</th><th>Statut / score</th><th>Commentaire</th></tr></thead><tbody>${rows}</tbody></table>`
      : '';
    const list = (sec.list || [])
      .map((item) => `<li>${esc(item)}</li>`)
      .join('');
    const ul = list ? `<ul>${list}</ul>` : '';
    const p = sec.p ? `<p>${esc(sec.p)}</p>` : '';
    return `<section><h2>${esc(sec.h)}</h2>${p}${table}${ul}</section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} — Horizon Farm ERP</title>
  <style>
    :root { --ink: #2f2415; --muted: #8a7456; --border: #eadcc2; --bg: #fffdf8; --accent: #9a6b12; --good: #047857; --warn: #b45309; --bad: #b91c1c; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: var(--ink); background: #f5f0e8; margin: 0; line-height: 1.5; }
    .wrap { max-width: 920px; margin: 0 auto; padding: 24px 20px 48px; }
    header { background: var(--ink); color: #fffdf8; padding: 28px 24px; border-radius: 16px; margin-bottom: 24px; }
    header h1 { margin: 0 0 8px; font-size: 1.5rem; }
    header p { margin: 0; opacity: 0.85; font-size: 0.95rem; }
    .score { display: inline-block; margin-top: 12px; padding: 6px 14px; background: rgba(255,253,248,0.15); border-radius: 999px; font-weight: 700; }
    section { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 20px 22px; margin-bottom: 16px; }
    h2 { font-size: 1.1rem; margin: 0 0 12px; color: var(--accent); }
    p { margin: 0 0 10px; color: var(--muted); font-size: 0.95rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; margin-top: 8px; }
    th, td { border-bottom: 1px solid var(--border); padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: var(--bg); font-weight: 700; }
    ul { margin: 8px 0 0; padding-left: 1.25rem; }
    li { margin-bottom: 6px; font-size: 0.92rem; }
    footer { text-align: center; font-size: 0.8rem; color: var(--muted); margin-top: 24px; }
    code { background: var(--bg); padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${esc(title)}</h1>
      <p>${esc(subtitle)} · Audit lecture seule · 9 juin 2026</p>
      <span class="score">Score global : ${esc(score)}</span>
    </header>
    ${body}
    <footer>Horizon Farm ERP — Vision 2026–2027 · Document généré pour archivage local</footer>
  </div>
</body>
</html>`;
}

const audits = [
  {
    file: 'AUDIT_MODULE_CULTURES_2026-06-09.html',
    title: 'Audit complet — Module Cultures',
    subtitle: 'CulturesRecoveredModule.jsx · 10 onglets',
    score: '58 / 100',
    sections: [
      {
        h: 'Synthèse exécutive',
        p: 'Module bien structuré en hubs V3 avec workflows récolte → stock → opportunité. Charge : 10 onglets et recoupements Dashboard / Objectifs / Commercial sur le pilotage.',
        list: [
          'Point d\'entrée canonique : CulturesRecoveredModule.jsx (274 lignes orchestrateur)',
          'Workflows : culturesWorkflow.js, commitCultureHarvest, runCultureHarvestSideEffects',
          'Legacy : CulturesV2–V5, bridges orphelins (voir CULTURES_LEGACY_NOTES.md)',
        ],
      },
      {
        h: 'Onglets cibles',
        rows: [
          ['Pilotage', '58/100', 'KPI + brief IA + ObjectivePerformanceCard + repair — doublon Objectifs/Dashboard'],
          ['Cycles', '52/100', 'CulturesCyclesHub — calendrier campagnes, lien Centre Saisons'],
          ['Parcelles & Cultures', '65/100', 'CRUD fiches, parcelles, campagnes — hub principal'],
          ['Intrants & Météo', '60/100', 'Intrants, météo live, coûts semences/engrais'],
          ['Santé & Protection', '58/100', 'Traitements phytosanitaires, alertes'],
          ['Récoltes', '66/100', 'Workflow récolte officiel, side effects stock/commercial'],
          ['Transformation', '62/100', 'Hub transformation + workflows'],
          ['Économie circulaire', '55/100', 'Lien fumier / NPK — aligné Objectifs sandbox'],
          ['Annexe', '50/100', 'Documents cultures'],
          ['Graphiques', '52/100', 'ModuleGraphiquesTab + narratives'],
        ],
      },
      {
        h: 'Architecture',
        p: 'Pas de header score permanent (bon). Header fixe titre + période. Contenu uniquement dans l\'onglet actif.',
        list: [
          'syncHarvest sur create/update culture — boucle récolte automatique',
          'Objectifs sandbox « Lancer campagne » crée culture via onCreateCulture',
        ],
      },
      {
        h: 'Doublons inter-modules',
        rows: [
          ['CA cultures', 'Commercial Ventes / Objectifs BP', 'Récolte → opportunité auto'],
          ['Stock récolte', 'Achats & Stock', 'Création stock via side effects — canon OK'],
          ['Objectif cultures', 'Objectifs + Dashboard', 'ObjectivePerformanceCard dans Pilotage'],
          ['Cycles maraîchage', 'Centre Saisons + Objectifs Sandbox', 'Économie circulaire partielle'],
        ],
      },
      {
        h: 'Tests',
        p: 'culturesWorkflow.test.js, culturesV1.test.js — couverture workflows récolte bonne.',
        list: [
          'Gap : tests intégration 10 onglets navigation',
          'Gap : campagne Objectifs → Cultures E2E',
        ],
      },
      {
        h: 'Priorités',
        list: [
          'P1 — Alléger Pilotage (retirer ObjectivePerformanceCard ou lien seul)',
          'P1 — Réduire à 6–7 onglets visibles (grouper Intrants+Santé, Transformation+Économie)',
          'P2 — Nettoyer legacy CulturesV2/V4 si grep confirme zéro import',
          'P2 — Documenter entité parcelle vs culture (record_type)',
        ],
      },
      {
        h: 'Points forts',
        list: [
          'Workflow récolte → stock → opportunité sans double saisie',
          'Hubs modulaires (Parcelles, Récoltes, Intrants) clairs',
          'Économie circulaire présente (différenciant vs AgriPilot)',
        ],
      },
    ],
  },
  {
    file: 'AUDIT_MODULE_COMMERCIAL_2026-06-09.html',
    title: 'Audit complet — Module Commercial',
    subtitle: 'CommercialRecoveredModule.jsx · 10 onglets',
    score: '61 / 100',
    sections: [
      {
        h: 'Synthèse exécutive',
        p: 'Module le plus complet du cycle vente (opportunité → commande → livraison → paiement → facture). Résumé encore trop chargé. Registre anti-duplication bien aligné (vente uniquement ici).',
        list: [
          'Orchestrateur : CommercialRecoveredModule.jsx (~673 lignes)',
          'Ventes : VentesV5 embedded — workflow commercialSaleWorkflow',
          'Clients : ClientsReadable + segments, prospects, relances WhatsApp',
        ],
      },
      {
        h: 'Onglets cibles',
        rows: [
          ['Résumé', '48/100', '6 KPI + quotes + reconciliation + insight + todos — surcharge'],
          ['Ventes', '72/100', 'VentesV5 — chemin canonique vente'],
          ['Clients', '65/100', 'Fiches, créances, segments, prospects'],
          ['Livraisons', '64/100', 'Queue livraisons, sync documents'],
          ['Abonnements', '60/100', 'Subscriptions panel'],
          ['Relances', '63/100', 'Scheduled relances + WhatsApp prep'],
          ['Opportunités', '68/100', 'Auto-opportunités stock/cultures/lots + conversion vente'],
          ['Pilotage', '58/100', 'Marges, graphiques — doublon partiel Résumé/Graphiques'],
          ['Annexe', '52/100', 'Documents commercial'],
          ['Graphiques', '55/100', 'ModuleGraphiquesTab riche'],
        ],
      },
      {
        h: 'Header & navigation',
        p: 'CommercialModuleHeader : score santé + badges créances/todos sur tous onglets. CommercialMobileToolbar sticky (4 actions).',
        list: [
          'horizon-open-form listener pour sale_record → Ventes',
          'Tab badges dynamiques (Ventes, Clients, Livraisons, etc.)',
        ],
      },
      {
        h: 'Doublons (registre anti-duplication)',
        rows: [
          ['Création vente', 'Commercial Ventes', 'Source de vérité — OK'],
          ['Encaissements', 'Finance', 'Redirect — pas création vente en Finance'],
          ['CA / objectifs', 'Objectifs, Dashboard, Centre', 'Lecture croisée — vigilance'],
          ['Stock vendable', 'Achats Stock', 'Publication via sellableStock — OK'],
        ],
      },
      {
        h: 'Workflows',
        list: [
          'buildSaleFormFromOpportunity — conversion opportunité → vente',
          'commercialScheduledRelances — relances programmées',
          'commercialDeliverySync — livraisons / documents',
          'WhatsApp logs — préparation message, pas envoi auto',
        ],
      },
      {
        h: 'Tests',
        p: '12+ fichiers commercial*.test.js — workflows vente, relances, anti-duplication UX.',
      },
      {
        h: 'Priorités',
        list: [
          'P0 — Résumé : retirer CommercialQuotesPanel et ReconciliationPanel du Résumé (déplacer Ventes/Pilotage)',
          'P1 — Fusionner teaser Relances (Résumé) avec onglet Relances seul',
          'P2 — Pilotage vs Graphiques : un seul point graphiques avancés',
          'P2 — Réduire props salesProps (ligne monolithique) — maintenance',
        ],
      },
      {
        h: 'Points forts',
        list: [
          'Cycle vente bout-en-bout le plus mature de l\'ERP',
          'Opportunités auto depuis stock/cultures/élevage',
          'commercialUxAntiDuplication.test.js — garde-fous',
        ],
      },
    ],
  },
  {
    file: 'AUDIT_MODULE_ACHATS_STOCK_2026-06-09.html',
    title: 'Audit complet — Module Achats & Stock',
    subtitle: 'AchatsStockRecoveredModule.jsx · 7 onglets',
    score: '63 / 100',
    sections: [
      {
        h: 'Synthèse exécutive',
        p: 'Module V3 digestible : Résumé = KPI + actions ; détail en onglets. StocksV5 canonique pour CRUD stock. Mouvements = ledger lecture. Bon alignement anti-duplication achats.',
        list: [
          'Orchestrateur : AchatsStockRecoveredModule.jsx (~428 lignes)',
          'Stock UI : StocksV5 (ne pas supprimer V2–V5 historiques)',
          'Réception : emitHorizonForm stock_purchase — chemin canonique',
        ],
      },
      {
        h: 'Onglets cibles',
        rows: [
          ['Résumé', '62/100', '6 KPI cliquables + parcours rapide + accordéon analyse — bien calibré V3'],
          ['Stock', '70/100', 'StocksV5 + transferts/sources repliables'],
          ['Achats', '65/100', 'AchatsStockPurchasesPanel — à payer, preuves'],
          ['Fournisseurs', '64/100', 'FournisseursReadable (dettes complètes)'],
          ['Mouvements', '66/100', 'Ledger stock_movements — readonly saisie'],
          ['Annexe', '50/100', 'Documents achats/stock'],
          ['Graphiques', '52/100', 'ModuleGraphiquesTab'],
        ],
      },
      {
        h: 'Header',
        p: 'Score santé stock /100 sur tous onglets — même pattern Élevage/Achats. Pas de mobile toolbar dédiée (moins critique que Commercial).',
      },
      {
        h: 'Doublons (documentés ACHATS_STOCK_LEGACY_NOTES)',
        rows: [
          ['Saisie stock', 'Stock onglet', 'Mouvements = historique readonly — OK'],
          ['Dettes fournisseurs', 'Fournisseurs', 'Aperçu compact en Résumé — volontaire'],
          ['Charge vs achat', 'Finance', 'Redirect registry charge_vs_stock'],
          ['Alimentation élevage', 'Élevage workflow', 'StockFeedingElevageHint — renvoi OK'],
        ],
      },
      {
        h: 'Workflows & données',
        list: [
          'stockPurchaseWorkflow — réception → stock + finance',
          'stock_movements + farm_id (migration 20260604120000 requise prod)',
          'buildExpiryLossPatch — péremption depuis Résumé',
          'createSupplierFollowUpTask — relance fournisseur',
          'CONSUMPTION_GAPS documentés (santé sans stock_id, emballages œufs)',
        ],
      },
      {
        h: 'Interconnexions',
        rows: [
          ['Élevage', 'Sorties aliment via workflow élevage', 'OK'],
          ['Commercial', 'Lien Opportunités depuis Résumé', 'OK'],
          ['Cultures', 'Stock récolte via cultures side effects', 'OK'],
          ['Finance', 'Achats → transactions', 'OK'],
        ],
      },
      {
        h: 'Tests',
        p: 'achatsStockV1–V3, stockPurchaseWorkflow — couverture achats et ledger.',
      },
      {
        h: 'Priorités',
        list: [
          'P1 — Vérifier migration stock_movements en prod (farm_id, dedupe_key)',
          'P2 — Header score → lien onglet Stock uniquement',
          'P2 — Unifier CMUP affichage Résumé vs Stock',
          'P3 — Mobile toolbar rapide (réception, mouvement)',
        ],
      },
      {
        h: 'Points forts',
        list: [
          'Digestibilité V3 exemplaire (KPI Résumé + détail onglets)',
          'StocksV5 stable, panels V3 branchés et documentés',
          'Qualité données (AchatsStockDataQualityPanel)',
          'Transferts inter-fermes',
        ],
      },
    ],
  },
];

for (const audit of audits) {
  const path = join(outDir, audit.file);
  writeFileSync(path, htmlPage(audit), 'utf8');
  console.log(`Écrit : ${path}`);
}
