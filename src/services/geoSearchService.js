import { DEFAULT_FARM_COORDS, DEFAULT_COUNTRY } from '../utils/location';

const overpassEndpoint = 'https://overpass-api.de/api/interpreter';

const haversineKm = (a, b) => {
  const toRad = (v) => (Number(v) * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * r * Math.asin(Math.sqrt(x));
};

export const getCurrentPositionSafe = () =>
  new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ...DEFAULT_FARM_COORDS, source: 'fallback_dakar' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, source: 'gps_utilisateur' }),
      () => resolve({ ...DEFAULT_FARM_COORDS, source: 'fallback_dakar' }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  });

const buildOverpassQuery = ({ latitude, longitude, radiusKm, tokens }) => {
  const radius = Math.round(radiusKm * 1000);
  const regex = tokens.join('|');
  return `
[out:json][timeout:25];
(
  node["name"~"${regex}",i](around:${radius},${latitude},${longitude});
  way["name"~"${regex}",i](around:${radius},${latitude},${longitude});
  relation["name"~"${regex}",i](around:${radius},${latitude},${longitude});
  node["amenity"~"veterinary|clinic|pharmacy",i](around:${radius},${latitude},${longitude});
  node["shop"~"agrarian|farm|hardware|garden_centre",i](around:${radius},${latitude},${longitude});
);
out center tags 25;`;
};

const normalizeOsmElement = (element, origin) => {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  const coords = { latitude, longitude };
  const tags = element.tags || {};
  const address = [tags['addr:street'], tags['addr:city'], tags['addr:country'] || DEFAULT_COUNTRY].filter(Boolean).join(', ');

  return {
    id: `OSM-${element.type}-${element.id}`,
    external_id: `OSM-${element.type}-${element.id}`,
    nom: tags.name || 'Nom non renseigne',
    adresse: address || 'Adresse non renseignee',
    tel: tags.phone || tags['contact:phone'] || 'Non renseigne',
    note: 'Non disponible',
    gps: latitude && longitude ? `${latitude},${longitude}` : '',
    latitude: latitude || null,
    longitude: longitude || null,
    distance_km: latitude && longitude ? Number(haversineKm(origin, coords).toFixed(1)) : null,
    source: 'openstreetmap',
    verified: false,
    favorite: false,
    notes: '',
    map_url: latitude && longitude ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}` : '',
  };
};

export const searchGeoPlaces = async ({ kind = 'veterinaires', latitude, longitude, radiusKm = 25 } = {}) => {
  const origin = latitude && longitude ? { latitude, longitude } : await getCurrentPositionSafe();
  const tokens = kind === 'fournisseurs'
    ? ['aliment betail', 'volaille', 'provenderie', 'poussins', 'couvoir', 'semences', 'engrais', 'materiel agricole', 'irrigation']
    : ['veterinaire', 'veterinary', 'clinique veterinaire', 'cabinet veterinaire', 'pharmacie veterinaire'];

  const query = buildOverpassQuery({ latitude: origin.latitude, longitude: origin.longitude, radiusKm, tokens });
  const response = await fetch(overpassEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ data: query }),
  });

  if (!response.ok) throw new Error('Recherche OpenStreetMap indisponible pour le moment.');
  const payload = await response.json();
  const results = (payload.elements || []).map((element) => normalizeOsmElement(element, origin));

  return {
    source: 'openstreetmap',
    origin,
    radiusKm,
    results,
    message: results.length
      ? `${results.length} resultats OpenStreetMap trouves autour de la position utilisee.`
      : 'Aucune source reelle trouvee. Tu peux ajouter manuellement ou configurer une API Google Places plus complete.',
  };
};
