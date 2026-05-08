export const AVICOLE_ACTIVITY_TYPES = ['Pondeuse', 'Chair'];

export const isPondeuseLot = (lot = {}) =>
  lot.type === 'Pondeuse' || String(lot.type || '').toLowerCase() === 'pondeuse';

export const isChairLot = (lot = {}) =>
  lot.type === 'Chair' || ['chair', 'poulet_chair'].includes(String(lot.type || '').toLowerCase());

export const filterLotsByActivity = (lots = [], activityType = 'Pondeuse') =>
  lots.filter((lot) => (activityType === 'Pondeuse' ? isPondeuseLot(lot) : isChairLot(lot)));

export const getDefaultLotForActivity = ({ activityType = 'Pondeuse', id = '', today = '' } = {}) => {
  const isPondeuse = activityType === 'Pondeuse';
  return {
    id,
    type: activityType,
    phase: isPondeuse ? 'En ponte' : 'Croissance',
    date_debut: today,
    duree_cycle_valeur: isPondeuse ? 18 : 45,
    duree_cycle_unite: isPondeuse ? 'mois' : 'jours',
    initial_count: 0,
    mortality: 0,
    vols: 0,
    vendus: 0,
    reformes: 0,
    sorties: 0,
    malades: 0,
    health_status: 'sain',
    status: isPondeuse ? 'en_ponte' : 'en_croissance',
  };
};
