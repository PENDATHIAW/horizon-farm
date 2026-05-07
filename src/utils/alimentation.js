const ACTIVE_ADMIN_STATUSES = new Set(['actif', 'sain', 'malade', 'sous_traitement', 'a_surveiller', '', undefined, null]);
const EXCLUDED_ADMIN_STATUSES = new Set(['vendu', 'mort', 'vole', 'reforme']);

const animalTypeToCategory = {
  Bovin: 'bovin',
  Ovin: 'ovin',
  Caprin: 'caprin',
};

const lotTypeToCategory = {
  Pondeuse: 'pondeuse',
  Chair: 'poulet_chair',
};

export const isActiveAnimalForFeeding = (animal = {}) => {
  const adminStatus = animal.status || 'actif';
  if (EXCLUDED_ADMIN_STATUSES.has(adminStatus)) return false;
  return ACTIVE_ADMIN_STATUSES.has(adminStatus) || ['sain', 'malade', 'sous_traitement', 'a_surveiller'].includes(animal.health_status);
};

export const getAnimalFeedingCategory = (animal = {}) => animalTypeToCategory[animal.type] || 'bovin';

export const getLotFeedingCategory = (lot = {}) => lotTypeToCategory[lot.type] || 'pondeuse';

export const getHeadsForFeedingLog = ({ log = {}, animals = [], lots = [] }) => {
  if (log.type_cible === 'lot_avicole') {
    const lot = lots.find((item) => item.id === log.cible_id);
    if (lot) return Number(lot.current_count || 0);
    return lots
      .filter((item) => getLotFeedingCategory(item) === log.categorie)
      .reduce((sum, item) => sum + Number(item.current_count || 0), 0);
  }

  return animals.filter((animal) => isActiveAnimalForFeeding(animal) && getAnimalFeedingCategory(animal) === log.categorie).length;
};

export const enrichFeedingLogs = ({ logs = [], animals = [], lots = [], fournisseurs = [] }) =>
  logs.map((log) => {
    const heads = getHeadsForFeedingLog({ log, animals, lots });
    const amount = Number(log.montant_total || 0);
    const days = Math.max(Number(log.duree_jours || 30), 1);
    const fournisseur = fournisseurs.find((item) => item.id === log.fournisseur_id);

    return {
      ...log,
      nombre_tetes: heads,
      cout_moyen_tete: heads > 0 ? amount / heads : 0,
      cout_moyen_jour: amount / days,
      cout_moyen_tete_jour: heads > 0 ? amount / heads / days : 0,
      fournisseur_nom: fournisseur?.nom || log.fournisseur_id || '-',
    };
  });

export const getCalculatedAnimalFeedingCost = ({ animal = {}, feedingLogs = [], animals = [] }) => {
  if (!isActiveAnimalForFeeding(animal)) return 0;

  const category = getAnimalFeedingCategory(animal);
  const activeHeads = animals.filter((item) => isActiveAnimalForFeeding(item) && getAnimalFeedingCategory(item) === category).length || 1;
  const totalForCategory = feedingLogs
    .filter((log) => log.type_cible === 'categorie_animale' && log.categorie === category)
    .reduce((sum, log) => sum + Number(log.montant_total || 0), 0);

  if (totalForCategory > 0) return totalForCategory / activeHeads;

  return 0;
};

export const getFeedingKpis = ({ logs = [], animals = [], lots = [] }) => {
  const enriched = enrichFeedingLogs({ logs, animals, lots });
  const byCategory = enriched.reduce((acc, log) => {
    acc[log.categorie] = (acc[log.categorie] || 0) + Number(log.montant_total || 0);
    return acc;
  }, {});

  return {
    bovin: byCategory.bovin || 0,
    ovin: byCategory.ovin || 0,
    caprin: byCategory.caprin || 0,
    avicole: Number(byCategory.pondeuse || 0) + Number(byCategory.poulet_chair || 0),
    averagePerHead: enriched.length
      ? enriched.reduce((sum, log) => sum + Number(log.cout_moyen_tete || 0), 0) / enriched.length
      : 0,
  };
};
