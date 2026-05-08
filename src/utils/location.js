export const DEFAULT_COUNTRY = 'Senegal';
export const DEFAULT_PHONE = '+221770000000';
export const DEFAULT_MAP_QUERY = 'Dakar Senegal';
export const DEFAULT_FARM_COORDS = {
  latitude: 14.7167,
  longitude: -17.4677,
};

export const isSenegalCoords = ({ latitude, longitude } = {}) => {
  const lat = Number(latitude);
  const lon = Number(longitude);
  return lat >= 12 && lat <= 17 && lon >= -18 && lon <= -11;
};

const hasValidCoords = (record = {}) => {
  const lat = Number(record.latitude);
  const lon = Number(record.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0;
};

const gpsLooksLikeCoords = (gps = '') => /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(String(gps));

export const buildSenegalMapQuery = (record = {}, fallback = DEFAULT_MAP_QUERY) => {
  if (hasValidCoords(record)) return `${record.latitude},${record.longitude}`;
  if (gpsLooksLikeCoords(record.gps)) return record.gps;

  const text = String(record.adresse || record.nom || record.name || record.gps || fallback || DEFAULT_MAP_QUERY).trim();
  if (!text || /non renseigne|non renseignée|undefined|null/i.test(text)) return fallback;
  return /senegal|sénégal|dakar|thies|thiès|mbour|saint-louis|kaolack|ziguinchor|rufisque/i.test(text)
    ? text
    : `${text}, Senegal`;
};
