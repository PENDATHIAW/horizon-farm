import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, MANAGEMENT_ROLES } from './shared.js';

export default defineModuleTabs('objectifs_croissance', labels.objectifs_croissance, [
  { id: 'objectifs', component: 'Objectifs', aliases: ['Suivi du Business Plan', 'Prévisionnel vs réel', 'Performance', 'Objectifs & Écarts', 'Rentabilité Lot & Cycle', 'Tableau de bord graphique'] },
  { id: 'scenarios', component: 'Scénarios', aliases: ['Simulations', 'Simulateur Sandbox', 'Capacité', 'Rentabilité', 'Capacité de remboursement', 'Efficacité Technique & Zootechnique', 'Sécurisation des Flux', 'Prévisions', 'Plans', 'Financeurs', 'Investisseurs', 'Objectifs & Écarts Zootechniques', 'Flux & Équilibres', 'Maraîchage & Diversification', 'Efficacité Technique'] },
  { id: 'historique', component: 'Historique objectifs', aliases: ['Graphiques', 'Annexe'] },
]).map((tab) => Object.freeze({ ...tab, requiredRoles: MANAGEMENT_ROLES }));
