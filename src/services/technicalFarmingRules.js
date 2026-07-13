import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const todayIso = () => new Date().toISOString();
const daysSince = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
};
const ageDays = (row = {}) => daysSince(row.date_debut || row.entry_date || row.date_entree || row.created_at) ?? 0;
const currentCount = (lot = {}) => {
  const initial = toNumber(lot.initial_count ?? lot.effectif_initial ?? lot.count);
  const exits = toNumber(lot.mortality) + toNumber(lot.vols) + toNumber(lot.vendus) + toNumber(lot.reformes) + toNumber(lot.sorties) + toNumber(lot.abattus);
  return Math.max(0, toNumber(lot.current_count ?? lot.effectif_actuel) || initial - exits);
};
const mortalityRate = (lot = {}) => {
  const initial = toNumber(lot.initial_count ?? lot.effectif_initial);
  return initial > 0 ? (toNumber(lot.mortality) / initial) * 100 : 0;
};
const lotText = (lot = {}) => norm(`${lot.type || ''} ${lot.categorie || ''} ${lot.production_type || ''} ${lot.activity_type || ''} ${lot.name || ''} ${lot.nom || ''}`);
const isChair = (lot = {}) => lotText(lot).includes('chair') || lotText(lot).includes('broiler');
const isPondeuse = (lot = {}) => lotText(lot).includes('pondeuse') || lotText(lot).includes('ponte') || lotText(lot).includes('oeuf') || lotText(lot).includes('œuf');
const surfaceOf = (row = {}) => toNumber(row.surface_batiment ?? row.surface_logement ?? row.surface ?? row.surface_m2);
const stockName = (stock = {}) => norm(`${stock.nom || ''} ${stock.produit || ''} ${stock.categorie || ''} ${stock.category || ''} ${stock.type || ''}`);
const stockQty = (stock = {}) => toNumber(stock.quantite ?? stock.quantity);
const isStockMatch = (stock = {}, patterns = []) => patterns.some((pattern) => stockName(stock).includes(pattern));
const stockTotal = (stocks = [], patterns = []) => arr(stocks).filter((stock) => isStockMatch(stock, patterns)).reduce((sum, stock) => sum + stockQty(stock), 0);
const lastEventDays = (events = [], entityId, terms = []) => {
  const matches = arr(events).filter((event) => String(event.entity_id || event.source_id || event.related_id || '') === String(entityId || '') && terms.some((term) => norm(`${event.title || ''} ${event.description || ''} ${event.event_type || ''} ${event.type_evenement || ''}`).includes(term)));
  const dates = matches.map((event) => daysSince(event.event_date || event.date || event.created_at)).filter((value) => value !== null);
  return dates.length ? Math.min(...dates) : null;
};

function makeAlert({ id, title, message, module_source, entity_type, entity_id, severity = 'warning', action_recommandee, responsable = 'TEAM-FERME', amount = 0 }) {
  return { id, title, message, module_source, entity_type, entity_id, severity, status: 'nouvelle', action_recommandee, responsable, amount, isAuto: true, created_at: todayIso(), technical_rule: true };
}

export const TECHNICAL_STANDARDS = {
  chair: { densityMin: 10, densityMax: 12, starterTemp: 32, starterDays: 7, sanitaryBreakDays: 15, weeklyWeighingDays: 7, criticalMortalityRate: 4 },
  pondeuse: { lightHours: 16, feedMinG: 110, feedMaxG: 120, nestRatio: 5, eggCollectionsDay: 3, criticalMortalityRate: 4 },
  ruminants: { dewormingMinDays: 90, dewormingMaxDays: 180, waterMinL: 40, waterMaxL: 100, hayCoverageDays: 30 },
};

export function buildAvicoleTechnicalAlerts({ lots = [], stocks = [], businessEvents = [] } = {}) {
  const alerts = [];
  const disinfectantStock = stockTotal(stocks, ['pediluve', 'desinfect', 'désinfect', 'biosécur', 'biosecur']);
  const beddingStock = stockTotal(stocks, ['copeaux', 'litiere', 'litière']);
  const calciumStock = stockTotal(stocks, ['coquillage', 'calcium', 'carbonate']);
  arr(lots).forEach((lot) => {
    const id = lot.id;
    const count = currentCount(lot);
    const surface = surfaceOf(lot);
    const density = surface > 0 ? count / surface : 0;
    const age = ageDays(lot);
    const mRate = mortalityRate(lot);
    const temperature = toNumber(lot.temperature_batiment ?? lot.temperature ?? lot.temp_batiment);
    const lightHours = toNumber(lot.heures_lumiere_jour ?? lot.light_hours);
    const nests = toNumber(lot.nombre_pondoirs ?? lot.nests_count);
    const collections = toNumber(lot.ramassages_oeufs_jour ?? lot.egg_collections_day);
    const feedG = toNumber(lot.aliment_g_par_poule ?? lot.feed_g_per_bird_day);
    const lastWeighing = daysSince(lot.date_derniere_pesee ?? lot.last_weighing_date);
    const sanitaryBreak = toNumber(lot.vide_sanitaire_jours ?? lot.sanitary_break_days);

    if (isChair(lot)) {
      if (mRate >= TECHNICAL_STANDARDS.chair.criticalMortalityRate) alerts.push(makeAlert({ id: `tech-chair-mortality-${id}`, title: `Chair · mortalité élevée ${lot.name || lot.nom || id}`, message: `${mRate.toFixed(1)}% de mortalité. Renforcer biosécurité, eau, chauffage et observation sanitaire.`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: id, severity: 'critique', action_recommandee: 'Contrôler santé, eau, litière, température et pédiluve', responsable: 'TEAM-AVICOLE' }));
      if (age <= TECHNICAL_STANDARDS.chair.starterDays && temperature > 0 && temperature < 30) alerts.push(makeAlert({ id: `tech-chair-temp-${id}`, title: `Chair · chauffage insuffisant ${lot.name || lot.nom || id}`, message: `Démarrage à ${temperature}°C. Référence terrain: environ 32°C les premiers jours.`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: id, severity: 'critique', action_recommandee: 'Ajuster chauffage et vérifier comportement des poussins', responsable: 'TEAM-AVICOLE' }));
      if (surface > 0 && density > TECHNICAL_STANDARDS.chair.densityMax) alerts.push(makeAlert({ id: `tech-chair-density-${id}`, title: `Chair · densité élevée ${lot.name || lot.nom || id}`, message: `${density.toFixed(1)} sujets/m². Recommandation: 10-12 sujets/m².`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: id, severity: 'warning', action_recommandee: 'Réduire densité ou augmenter surface disponible', responsable: 'TEAM-AVICOLE' }));
      if (lastWeighing !== null && lastWeighing > TECHNICAL_STANDARDS.chair.weeklyWeighingDays) alerts.push(makeAlert({ id: `tech-chair-weighing-${id}`, title: `Chair · pesée hebdomadaire à faire ${lot.name || lot.nom || id}`, message: `Dernière pesée il y a ${lastWeighing} jours.`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: id, severity: 'warning', action_recommandee: 'Peser un échantillon et mettre à jour le poids moyen', responsable: 'TEAM-AVICOLE' }));
      if (sanitaryBreak > 0 && sanitaryBreak < TECHNICAL_STANDARDS.chair.sanitaryBreakDays) alerts.push(makeAlert({ id: `tech-chair-sanitary-${id}`, title: `Chair · vide sanitaire court ${lot.name || lot.nom || id}`, message: `${sanitaryBreak} jour(s) renseigné(s). Référence: 15 jours.`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: id, severity: 'warning', action_recommandee: 'Respecter le vide sanitaire avant nouvelle bande', responsable: 'TEAM-AVICOLE' }));
      if (beddingStock <= 0) alerts.push(makeAlert({ id: `tech-chair-bedding-stock-${id}`, title: 'Chair · stock copeaux/litière absent', message: 'Aucun stock de copeaux/litière détecté pour gérer l’humidité.', module_source: 'stock', entity_type: 'stock', entity_id: id, severity: 'warning', action_recommandee: 'Ajouter copeaux de bois au stock ou commander', responsable: 'TEAM-STOCK' }));
    }

    if (isPondeuse(lot)) {
      if (lightHours > 0 && lightHours < TECHNICAL_STANDARDS.pondeuse.lightHours) alerts.push(makeAlert({ id: `tech-layer-light-${id}`, title: `Pondeuses · lumière insuffisante ${lot.name || lot.nom || id}`, message: `${lightHours}h de lumière. Référence: 16h constantes.`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: id, severity: 'warning', action_recommandee: 'Compléter l’éclairage artificiel et stabiliser le programme lumineux', responsable: 'TEAM-AVICOLE' }));
      if (nests > 0 && count / Math.max(1, nests) > TECHNICAL_STANDARDS.pondeuse.nestRatio) alerts.push(makeAlert({ id: `tech-layer-nests-${id}`, title: `Pondeuses · pondoirs insuffisants ${lot.name || lot.nom || id}`, message: `${Math.round(count / Math.max(1, nests))} poules/nid. Référence: 1 nid pour 5 poules.`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: id, severity: 'warning', action_recommandee: 'Ajouter des nids ou réduire la pression sur les pondoirs', responsable: 'TEAM-AVICOLE' }));
      if (collections > 0 && collections < TECHNICAL_STANDARDS.pondeuse.eggCollectionsDay) alerts.push(makeAlert({ id: `tech-layer-collections-${id}`, title: `Pondeuses · ramassage œufs insuffisant ${lot.name || lot.nom || id}`, message: `${collections} ramassage(s)/jour. Référence: 3x/jour.`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: id, severity: 'info', action_recommandee: 'Planifier 3 ramassages quotidiens pour limiter casse et saleté', responsable: 'TEAM-AVICOLE' }));
      if (feedG > 0 && (feedG < TECHNICAL_STANDARDS.pondeuse.feedMinG || feedG > TECHNICAL_STANDARDS.pondeuse.feedMaxG)) alerts.push(makeAlert({ id: `tech-layer-feed-${id}`, title: `Pondeuses · ration à vérifier ${lot.name || lot.nom || id}`, message: `${feedG}g/poule/jour. Référence: 110-120g.`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: id, severity: 'warning', action_recommandee: 'Vérifier ration, gaspillage et qualité aliment', responsable: 'TEAM-AVICOLE' }));
      if (calciumStock <= 0) alerts.push(makeAlert({ id: `tech-layer-calcium-stock-${id}`, title: 'Pondeuses · calcium/coquillages absents du stock', message: 'Aucun stock calcium/coquillages détecté alors que les coquilles fragiles sont un risque clé.', module_source: 'stock', entity_type: 'stock', entity_id: id, severity: 'warning', action_recommandee: 'Ajouter coquillages broyés/calcium au stock', responsable: 'TEAM-STOCK' }));
      const pouxDays = lastEventDays(businessEvents, id, ['poux rouge', 'parasite', 'controle sanitaire', 'contrôle sanitaire']);
      if (pouxDays === null || pouxDays > 14) alerts.push(makeAlert({ id: `tech-layer-redmites-${id}`, title: `Pondeuses · contrôle poux rouges à faire ${lot.name || lot.nom || id}`, message: pouxDays === null ? 'Aucun contrôle poux rouges détecté.' : `Dernier contrôle il y a ${pouxDays} jours.`, module_source: 'sante', entity_type: 'lot_avicole', entity_id: id, severity: 'warning', action_recommandee: 'Contrôler nids, perchoirs et fissures puis traiter si besoin', responsable: 'TEAM-SANTE' }));
    }
  });
  if (disinfectantStock <= 0 && arr(lots).length) alerts.push(makeAlert({ id: 'tech-avicole-biosecurity-stock', title: 'Avicole · pédiluve/désinfectant absent du stock', message: 'La biosécurité exige pédiluve et désinfectant disponibles.', module_source: 'stock', entity_type: 'stock', entity_id: 'biosecurity', severity: 'critique', action_recommandee: 'Créer ou réapprovisionner stock désinfectant/pédiluve', responsable: 'TEAM-STOCK' }));
  return alerts;
}

export function buildAnimalTechnicalAlerts({ animaux = [], stocks = [], businessEvents = [] } = {}) {
  const alerts = [];
  const forageStock = stockTotal(stocks, ['foin', 'ensilage', 'fourrage', 'paille']);
  arr(animaux).forEach((animal) => {
    const id = animal.id;
    const speciesText = norm(`${animal.type || ''} ${animal.espece || ''} ${animal.categorie || ''}`);
    const isRuminant = ['bovin', 'ovin', 'caprin', 'mouton', 'chevre', 'chèvre'].some((term) => speciesText.includes(term));
    if (!isRuminant) return;
    const lastDeworming = daysSince(animal.date_dernier_deparasitage || animal.last_deworming_date) ?? lastEventDays(businessEvents, id, ['deparasitage', 'déparasitage']);
    if (lastDeworming === null || lastDeworming > TECHNICAL_STANDARDS.ruminants.dewormingMaxDays) alerts.push(makeAlert({ id: `tech-animal-deworm-${id}`, title: `Animal · déparasitage à programmer ${animal.name || animal.nom || id}`, message: lastDeworming === null ? 'Aucun déparasitage récent détecté.' : `Dernier déparasitage il y a ${lastDeworming} jours. Référence: 3-6 mois.`, module_source: 'sante', entity_type: 'animal', entity_id: id, severity: 'warning', action_recommandee: 'Programmer déparasitage et noter le traitement', responsable: 'TEAM-SANTE' }));
    const body = norm(animal.score_corporel || animal.etat_corporel || animal.body_condition);
    if (body.includes('maigre') || body.includes('faible')) alerts.push(makeAlert({ id: `tech-animal-body-${id}`, title: `Animal · état corporel faible ${animal.name || animal.nom || id}`, message: 'État corporel maigre/faible détecté.', module_source: 'animaux', entity_type: 'animal', entity_id: id, severity: 'warning', action_recommandee: 'Vérifier ration, parasites et accès à l’eau', responsable: 'TEAM-FERME' }));
    const water = toNumber(animal.eau_l_jour ?? animal.besoin_eau_l_jour);
    if (water > 0 && water < TECHNICAL_STANDARDS.ruminants.waterMinL) alerts.push(makeAlert({ id: `tech-animal-water-${id}`, title: `Animal · eau insuffisante ${animal.name || animal.nom || id}`, message: `${water}L/jour renseignés. Référence: 40-100L selon espèce et chaleur.`, module_source: 'animaux', entity_type: 'animal', entity_id: id, severity: 'critique', action_recommandee: 'Vérifier abreuvement et disponibilité eau propre', responsable: 'TEAM-FERME' }));
  });
  if (arr(animaux).length && forageStock <= 0) alerts.push(makeAlert({ id: 'tech-ruminants-forage-stock', title: 'Animaux · stock fourrage absent', message: 'Aucun stock foin/ensilage/fourrage détecté. Risque saison sèche.', module_source: 'stock', entity_type: 'stock', entity_id: 'fourrage', severity: 'warning', action_recommandee: 'Créer un stock de foin ou ensilage et fixer un seuil', responsable: 'TEAM-STOCK' }));
  return alerts;
}

export function buildTechnicalFarmingAlerts(context = {}) {
  return [
    ...buildAvicoleTechnicalAlerts(context),
    ...buildAnimalTechnicalAlerts(context),
  ];
}

export default buildTechnicalFarmingAlerts;
