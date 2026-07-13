/**
 * Configuration des onglets par module (chantier 3).
 *
 * Source unique consommée par ModuleTabsBar, par les modules et par les
 * deep-links. Pour chaque module, `onglets` liste EXACTEMENT les onglets que le
 * composant rend réellement (repris des constantes de navigation, qui sont la
 * vérité du rendu), avec id, libellé, composant de référence, rôle éventuel,
 * rôles masqués et flag éventuel. La barre d'onglets ne peut donc plus afficher
 * un onglet que le module ne sait pas rendre.
 *
 * `cible` documente la structure attendue par la version cible quand le module
 * n'est pas encore restructuré ; la reprise se fait module par module.
 */
import {
  DASHBOARD_TABS,
  ELEVAGE_TABS,
  CULTURES_TABS,
  COMMERCIAL_TABS,
  ACHATS_STOCK_TABS,
  FINANCE_TABS,
  ACTIVITE_SUIVI_TABS,
  DOCUMENTS_RAPPORTS_TABS,
  RH_TABS,
  OBJECTIFS_TABS,
  CENTRE_IA_TABS,
  SMARTFARM_TABS,
  SYNC_ACTIVITY_TABS,
  GESTION_SYSTEME_TABS,
} from '../utils/commercialNavigation.js';
import { AGRI_FEEDS_TABS } from '../config/agriFeeds.config.js';

const slug = (libelle) => String(libelle)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/œ/g, 'oe')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

/** Construit une entrée d'onglet ; le libellé est la chaîne réellement rendue. */
const onglet = (libelle, composant, options = {}) => ({
  id: options.id || slug(libelle),
  libelle,
  composant,
  role: options.role || null,
  rolesMasques: options.rolesMasques || [],
  flag: options.flag || null,
});

/** Onglets d'un module à partir de la liste réelle rendue, avec composant commun. */
const depuisTabs = (tabs, composant, perTab = {}) => tabs.map((libelle) => onglet(libelle, composant, perTab[libelle] || {}));

export const MODULE_TABS_CONFIG = {
  dashboard: {
    onglets: depuisTabs(DASHBOARD_TABS, 'AccueilConforme', {
      Pilotage: { rolesMasques: ['terrain', 'farm_agent', 'employe', 'farm_readonly'] },
    }),
  },
  assistant_erp: {
    flag: 'assistant_erp',
    cible: ['Conversation'],
    onglets: depuisTabs(['Hey Horizon', 'Questions métier', 'Aide à la décision', 'Recherche dans les données'], 'AssistantERPV2'),
  },
  centre_decisionnel: {
    onglets: depuisTabs(CENTRE_IA_TABS, 'CentreDecisionModule'),
  },
  agri_feeds: {
    flag: 'agri_feeds',
    cible: ['Vue d’ensemble', 'Matières & fournisseurs', 'Formulations', 'Production', 'Essais & performance', 'Qualité', 'Commercial', 'Coûts & décisions'],
    onglets: depuisTabs(AGRI_FEEDS_TABS, 'AgriFeedsModule'),
  },
  objectifs_croissance: {
    cible: ['Objectifs', 'Scénarios', 'Historique'],
    onglets: depuisTabs(OBJECTIFS_TABS, 'ObjectifsDecisionModule'),
  },
  elevage: {
    cible: ['Vue d’ensemble', 'Lots & animaux', 'Alimentation', 'Production', 'Santé & Biosécurité', 'Transformation', 'Coûts & performance', 'Historique'],
    onglets: depuisTabs(ELEVAGE_TABS, 'ElevageRecoveredModule'),
  },
  cultures: {
    cible: ['Parcelles', 'Campagnes', 'Irrigation', 'Intrants & fertilisation', 'Récoltes', 'Coûts & marge', 'Historique'],
    onglets: depuisTabs(CULTURES_TABS, 'CulturesRecoveredModule'),
  },
  commercial: {
    cible: ['Tableau de bord', 'Clients', 'Ventes & commandes', 'Livraisons', 'Factures & paiements', 'Créances & relances', 'Réclamations'],
    onglets: depuisTabs(COMMERCIAL_TABS, 'CommercialShell'),
  },
  achats_stock: {
    cible: ['Tableau de bord', 'Produits & catégories', 'Fournisseurs', 'Achats & réceptions', 'Stocks & lots', 'Mouvements', 'Inventaires'],
    onglets: depuisTabs(ACHATS_STOCK_TABS, 'AchatsStockRecoveredModule'),
  },
  finance_pilotage: {
    cible: ['Vue d’ensemble', 'Transactions', 'Trésorerie', 'Budget & écarts', 'Coûts & marges', 'Investissements & dettes'],
    onglets: depuisTabs(FINANCE_TABS, 'FinancePilotageRecoveredModule'),
  },
  activite_suivi: {
    cible: ['À faire', 'Calendrier', 'Alertes liées', 'Journal d’exploitation', 'Historique'],
    onglets: depuisTabs(ACTIVITE_SUIVI_TABS, 'ActiviteSuiviRecoveredModule'),
  },
  documents_rapports: {
    cible: ['Bibliothèque', 'Preuves & justificatifs', 'Rapports', 'Publications', 'Archives'],
    onglets: depuisTabs(DOCUMENTS_RAPPORTS_TABS, 'DocumentsRapportsModule'),
  },
  financements: {
    flag: 'financements',
    cible: ['Tableau de bord', 'Opportunités', 'Contacts & échanges', 'Candidatures', 'Pièces du dossier', 'Fonds & utilisation', 'Publications', 'Accès externes'],
    onglets: depuisTabs(['Tableau de bord', 'Opportunités', 'Contacts', 'Dossiers & pièces', 'Fonds & justificatifs', 'Espace Financeurs'], 'FinancementsModule', {
      'Espace Financeurs': { role: 'financeur_externe' },
    }),
  },
  equipe: {
    cible: ['Vue d’ensemble', 'Membres', 'Affectations', 'Absences'],
    onglets: depuisTabs(RH_TABS, 'OperationsRessourcesRecoveredModule'),
  },
  equipements: {
    cible: ['Parc', 'Acquisitions', 'Pannes', 'Réparations', 'Coûts & disponibilité'],
    onglets: depuisTabs(['Équipements', 'Maintenance', 'Pannes', 'Coûts', 'Disponibilité'], 'EquipementsV3'),
  },
  smartfarm: {
    flag: 'smartfarm',
    cible: ['Vue d’ensemble', 'Relevés d’eau', 'Énergie', 'Bâtiments', 'Dispositifs', 'Relevés & qualité', 'Configuration'],
    onglets: depuisTabs(SMARTFARM_TABS, 'SmartFarmRecoveredModule'),
  },
  sync_activity: {
    onglets: depuisTabs(SYNC_ACTIVITY_TABS, 'SyncActivityCenter'),
  },
  gestion_systeme: {
    cible: ['Fermes', 'Utilisateurs & accès', 'Rôles & permissions', 'Modules & activation', 'Paramètres', 'Référentiels', 'Catalogues KPI & alertes', 'Synchronisation', 'Audit & sécurité'],
    onglets: depuisTabs(GESTION_SYSTEME_TABS, 'GestionSystemeUnified', {
      'Vue admin': { role: 'admin' },
    }),
  },
};

/** Alias : anciens identifiants de module vers la même configuration. */
MODULE_TABS_CONFIG.centre_ia = MODULE_TABS_CONFIG.centre_decisionnel;
MODULE_TABS_CONFIG.rh = MODULE_TABS_CONFIG.equipe;

/** Libellés d'onglets par module, dérivés de la configuration. */
export const MODULE_TABS_LABELS = Object.fromEntries(
  Object.entries(MODULE_TABS_CONFIG).map(([moduleId, config]) => [
    moduleId,
    config.onglets.map((entree) => entree.libelle),
  ]),
);

export function ongletsDuModule(moduleId = '', { role = null, flags = null } = {}) {
  const config = MODULE_TABS_CONFIG[moduleId];
  if (!config) return [];
  return config.onglets
    .filter((entree) => !entree.rolesMasques.includes(role))
    .filter((entree) => !entree.flag || !flags || flags[entree.flag] !== false);
}
