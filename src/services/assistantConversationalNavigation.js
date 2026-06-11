/**
 * Navigation conversationnelle V7 — sans noms de modules ERP.
 */

const NAV_PHRASES = Object.freeze({
  dashboard: 'Revenons à la vue d\'ensemble de la ferme.',
  centre_ia: 'Regardons ce qui demande votre attention en priorité.',
  objectifs_croissance: 'Voyons où vous en êtes sur vos objectifs.',
  investisseurs_forums: 'Je vous prépare la vue pour vos financeurs.',
  elevage: 'Allons voir votre cheptel et vos lots.',
  cultures: 'Je vous montre vos parcelles et cultures.',
  commercial: 'Regardons vos ventes et vos clients.',
  achats_stock: 'Voyons ce qu\'il reste en stock.',
  finance_pilotage: 'Passons en revue votre situation financière.',
  activite_suivi: 'Je vous montre l\'activité récente de la ferme.',
  documents_rapports: 'Voici vos documents et rapports.',
  rh: 'Regardons vos équipes et ressources.',
  sync_activity: 'Je vérifie la synchronisation de la ferme.',
  gestion_systeme: 'J\'ouvre les paramètres de la ferme.',
  assistant_erp: 'Je suis là — continuez à me parler.',
});

export function buildConversationalNavigationReply(moduleId = '') {
  const phrase = NAV_PHRASES[moduleId] || 'Très bien — je vous y emmène.';
  return {
    title: 'Horizon',
    situation: phrase,
    cause: '',
    action: 'Vous pourrez revenir me parler dès que vous voulez.',
    sources: [],
    confidence: 96,
  };
}

export default buildConversationalNavigationReply;
