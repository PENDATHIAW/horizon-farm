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

export const buildSenegalMapQuery = (record = {}, fallback = DEFAULT_MAP_QUERY) => {
  const base = record.gps || record.adresse || record.nom || record.name || fallback;
  const text = String(base || fallback);
  return /senegal|senegal|dakar|thies|thiès|mbour|saint-louis|kaolack|ziguinchor/i.test(text)
    ? text
    : `${text}, Senegal`;
};
