import { arr, low, metaBase, money, pickRows, textOrMissing } from './coreUtils.js';

const CLOSED_ANIMAL_WORDS = ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'];

function isClosedAnimal(row = {}) {
  return CLOSED_ANIMAL_WORDS.some((word) => low(row.status || row.statut).includes(word));
}

function animalType(row = {}) {
  return textOrMissing(row.type || row.espece || row.species || row.categorie, 'Non renseigné');
}

/**
 * Synthèse élevage animaux (hors avicole intégré aux lots).
 */
export function getLivestockSummary(dataMap = {}) {
  const animaux = pickRows(dataMap, 'animaux');
  const sante = pickRows(dataMap, 'sante');
  const alimentationLogs = pickRows(dataMap, 'alimentation_logs', 'alimentationLogs');

  const active = animaux.filter((row) => !isClosedAnimal(row));
  const closed = animaux.filter(isClosedAnimal);

  const byType = {};
  active.forEach((row) => {
    const type = animalType(row);
    byType[type] = (byType[type] || 0) + 1;
  });

  const purchaseValue = active.reduce((sum, row) => sum + money(row.cout_achat ?? row.purchase_cost ?? row.prix_achat), 0);

  return {
    ...metaBase({ module: 'elevage_animaux' }),
    effectifs: {
      total_fiches: animaux.length,
      actifs: active.length,
      clos: closed.length,
      par_type: byType,
    },
    sante: {
      enregistrements_vaccins: sante.length,
    },
    alimentation_logs_count: alimentationLogs.filter((row) => {
      const moduleRef = low(row.module_lie || row.module || row.source_module || '');
      return moduleRef.includes('animal') || moduleRef.includes('bovin') || moduleRef.includes('ovin');
    }).length || alimentationLogs.length,
    valorisation_achat_actifs: purchaseValue,
  };
}

export default getLivestockSummary;
