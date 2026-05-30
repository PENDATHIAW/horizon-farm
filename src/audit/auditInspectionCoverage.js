import { auditManifest } from './auditManifest';
import { getDeepAuditFocus } from './deepAuditChecklist';

const arr = (value) => Array.isArray(value) ? value : [];

const defaultTargets = {
  cards: ['KPI principaux', 'Actions prioritaires', 'Alertes ou zéros suspects'],
  charts: ['Graphiques présents dans le module'],
  tables: ['Tableaux principaux', 'Actions par ligne'],
  forms: ['Formulaires du module'],
  workflows: ['Actions interconnectées du module', 'Documents/traces/tâches/alertes générés si pertinent'],
  simplification: ['Informations essentielles en haut', 'Détails secondaires en bas', 'Pas de double saisie', 'Champs libres seulement si observation/commentaire'],
};

const moduleTargets = {
  Accueil: { cards: ['CA total', 'Charges', 'Marge', 'Alertes critiques', 'Actions rapides'], charts: ['Évolution CA', 'Répartition activités'], tables: ['Alertes récentes', 'Tâches prioritaires'], forms: [], workflows: ['KPI Accueil → Objectifs/Finances/Ventes'], simplification: ['5 KPI essentiels en haut', 'Détails secondaires repliés'] },
  Animaux: { cards: ['Fiche animal', 'Coût total', 'Marge', 'Statut vendu', 'Prochaine pesée'], charts: ['Courbe croissance poids', 'Évolution coût/marge'], tables: ['Liste animaux', 'Historique pesées', 'Historique santé', 'Ventes liées'], forms: ['Ajouter animal', 'Modifier animal', 'Nouvelle pesée', 'Clôturer vente'], workflows: ['Pesée → échéance 15 jours', 'Animal vendu → commande/paiement/finance/verrouillage'], simplification: ['Poids/coût/marge/action suivante en haut', 'Historique en bas'] },
  Avicole: { cards: ['Lot chair', 'Lot pondeuses', 'Mortalité', 'Production œufs', 'Marge lot'], charts: ['Chair : poids/âge/mortalité', 'Pondeuses : ponte/œufs/alimentation/mortalité', 'Rentabilité par lot'], tables: ['Lots', 'Production œufs', 'Mortalité', 'Ventes partielles'], forms: ['Ajouter lot', 'Ajouter production', 'Déclarer mortalité', 'Vendre partiellement'], workflows: ['Production œufs → stock/opportunité', 'Vente partielle → finance/document/trace'], simplification: ['Séparer chair et pondeuses', 'Ne jamais afficher courbes chair dans pondeuses'] },
  Cultures: { cards: ['Parcelle', 'Surface', 'Stade', 'Coût culture', 'Récolte disponible', 'Marge'], charts: ['Évolution stade/récolte', 'Coûts par culture', 'Marge culture'], tables: ['Cultures', 'Récoltes', 'Pertes', 'Stock issu récolte'], forms: ['Ajouter culture', 'Modifier stade', 'Déclarer récolte'], workflows: ['Récolte → stock', 'Stock disponible → opportunité vente'], simplification: ['Action suivante selon stade', 'Éviter double saisie récolte/stock'] },
  Santé: { cards: ['Urgences', 'Rappels vaccins', 'Coûts santé', 'Preuves manquantes'], charts: ['Coût santé par période', 'Interventions par type'], tables: ['Interventions', 'Rappels', 'Preuves', 'Vétérinaires'], forms: ['Vaccination', 'Soin curatif', 'Déparasitage', 'Visite vétérinaire', 'Ordonnance', 'Upload preuve'], workflows: ['Intervention → coût finance', 'Preuve → document', 'Rappel → tâche/alerte', 'Impact santé → Impact Business structuré'], simplification: ['Formulaire adaptatif par type', 'Impact en catégories prédéfinies'] },
  Ventes: { cards: ['CA', 'À encaisser', 'À livrer', 'Factures manquantes', 'Créances'], charts: ['Évolution ventes', 'Encaissements', 'Impayés', 'Marge commerciale'], tables: ['Opportunités', 'Commandes', 'Paiements', 'Factures', 'Livraisons'], forms: ['Créer commande', 'Enregistrer paiement', 'Émettre facture', 'Livrer/récupérer'], workflows: ['Opportunité → commande → opportunité fermée', 'Paiement → finance', 'Facture → document', 'Vente → objectifs/accueil/trace'], simplification: ['Une vente = workflow complet', 'Pas de ressaisie finance/document'] },
  Finances: { cards: ['Recettes', 'Charges', 'Solde', 'Marge par activité', 'Flux non liés'], charts: ['Trésorerie', 'Recettes/charges', 'Marge par activité'], tables: ['Transactions', 'Justificatifs', 'Charges par module'], forms: ['Ajouter transaction', 'Associer justificatif'], workflows: ['Paiement vente → recette', 'Santé/stock/RH → charge', 'Finance → comptabilité/objectifs/accueil'], simplification: ['Transactions automatiques d’abord', 'Saisie manuelle seulement exception'] },
  Comptabilité: { cards: ['CA', 'Charges', 'Résultat', 'Marge', 'Pièces manquantes'], charts: ['Résultat mensuel', 'Charges par catégorie', 'CA par activité'], tables: ['Écritures', 'Pièces liées', 'Rapprochements'], forms: [], workflows: ['Finances → comptabilité', 'Documents → pièces justificatives'], simplification: ['Synthèse d’abord', 'Détails en accordéon', 'Signaler charges à zéro'] },
  Documents: { cards: ['Factures', 'Preuves santé', 'Ordonnances', 'Rapports', 'Documents sans lien'], charts: [], tables: ['Documents', 'Factures', 'Preuves', 'Rapports'], forms: ['Upload document', 'Associer module'], workflows: ['Facture → document', 'Santé → preuve/ordonnance', 'Audit → roadmap GitHub'], simplification: ['Recherche simple', 'Filtres par module/type'] },
  Alertes: { cards: ['Critiques', 'En retard', 'À traiter', 'Par module'], charts: ['Alertes par priorité', 'Alertes par module'], tables: ['Alertes', 'Actions recommandées'], forms: ['Créer/traiter alerte', 'Créer tâche depuis alerte'], workflows: ['Risque métier → alerte', 'Alerte critique → tâche', 'Alerte traitée → trace'], simplification: ['Critiques en haut', 'Action recommandée courte'] },
  Tâches: { cards: ['À faire aujourd’hui', 'En retard', 'Terrain', 'Assignées'], charts: ['Tâches par statut', 'Retards'], tables: ['Tâches', 'Responsables', 'Échéances'], forms: ['Créer tâche', 'Terminer tâche', 'Assigner responsable'], workflows: ['Pesée/vaccin/récolte/relance → tâche', 'Tâche terminée → trace'], simplification: ['Aujourd’hui d’abord', 'Créer tâches seulement si utile'] },
  'Impact Business': { cards: ['Impact financier', 'Impact santé', 'Impact stock', 'Actions recommandées'], charts: ['Impact par module', 'Impact par niveau'], tables: ['Événements impact', 'Actions'], forms: ['Impact ferme structuré'], workflows: ['Santé/vente/perte/stock → impact structuré', 'Impact critique → décision/alerte'], simplification: ['Catégorie + niveau + montant + action', 'Commentaire libre optionnel seulement'] },
};

const targetsForModule = (module) => moduleTargets[module] || defaultTargets;

function item(module, type, element) {
  return {
    id: `INSPECT-${module}-${type}-${element}`.replace(/[^a-zA-Z0-9]+/g, '-').toUpperCase(),
    module,
    type,
    element,
    status: 'a_inspecter',
    expected: type === 'formulaire'
      ? 'Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.'
      : type === 'graphe'
        ? 'Contrôler titre, source, unité, période, légende, cohérence métier et contexte.'
        : type === 'tableau'
          ? 'Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.'
          : type === 'carte_kpi'
            ? 'Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.'
            : type === 'workflow'
              ? 'Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.'
              : 'Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.',
  };
}

export function buildAuditInspectionCoverage() {
  return auditManifest.map((manifest) => {
    const targets = targetsForModule(manifest.module);
    const dimensions = getDeepAuditFocus(manifest.module).map((dimension) => ({
      id: dimension.id,
      title: dimension.title,
      checks_count: arr(dimension.checks).length,
      findings_expected: arr(dimension.findings),
    }));
    const inspection_items = [
      ...arr(targets.cards).map((x) => item(manifest.module, 'carte_kpi', x)),
      ...arr(targets.tables).map((x) => item(manifest.module, 'tableau', x)),
      ...arr(targets.charts).map((x) => item(manifest.module, 'graphe', x)),
      ...arr(targets.forms).map((x) => item(manifest.module, 'formulaire', x)),
      ...arr(targets.workflows).map((x) => item(manifest.module, 'workflow', x)),
      ...arr(targets.simplification).map((x) => item(manifest.module, 'simplification', x)),
    ];
    return {
      module: manifest.module,
      route: manifest.route,
      priority: manifest.priority,
      dimensions,
      inspection_items,
      counts: {
        cards: arr(targets.cards).length,
        tables: arr(targets.tables).length,
        charts: arr(targets.charts).length,
        forms: arr(targets.forms).length,
        workflows: arr(targets.workflows).length,
        simplification: arr(targets.simplification).length,
        total_inspection_items: inspection_items.length,
      },
    };
  });
}

export function buildAuditCoverageStats(coverage = []) {
  return arr(coverage).reduce((acc, module) => {
    acc.modules += 1;
    acc.dimensions += arr(module.dimensions).length;
    acc.control_points += arr(module.dimensions).reduce((sum, item) => sum + Number(item.checks_count || 0), 0);
    Object.entries(module.counts || {}).forEach(([key, value]) => { acc[key] = Number(acc[key] || 0) + Number(value || 0); });
    return acc;
  }, { modules: 0, dimensions: 0, control_points: 0, cards: 0, tables: 0, charts: 0, forms: 0, workflows: 0, simplification: 0, total_inspection_items: 0 });
}

export function buildAuditInspectionBacklog(coverage = []) {
  return arr(coverage).flatMap((module) => arr(module.inspection_items));
}
