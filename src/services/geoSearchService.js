import { DEFAULT_FARM_COORDS, DEFAULT_COUNTRY } from '../utils/location';

const overpassEndpoint = 'https://overpass-api.de/api/interpreter';

const curatedSenegalVets = [
  {
    id: 'LOCAL-VET-DAKAR-01',
    nom: 'Clinique Veterinaire Dakar',
    adresse: 'Dakar, Senegal',
    tel: 'Non renseigne',
    latitude: 14.6928,
    longitude: -17.4467,
  },
  {
    id: 'LOCAL-VET-DAKAR-02',
    nom: 'Service Veterinaire - Dakar Plateau',
    adresse: 'Plateau, Dakar, Senegal',
    tel: 'Non renseigne',
    latitude: 14.6670,
    longitude: -17.4350,
  },
  {
    id: 'LOCAL-VET-THIES-01',
    nom: 'Cabinet Veterinaire Thies',
    adresse: 'Thies, Senegal',
    tel: 'Non renseigne',
    latitude: 14.7910,
    longitude: -16.9359,
  },
  {
    id: 'LOCAL-VET-MBOUR-01',
    nom: 'Veterinaire Mbour',
    adresse: 'Mbour, Senegal',
    tel: 'Non renseigne',
    latitude: 14.4203,
    longitude: -16.9654,
  },
  {
    id: 'LOCAL-VET-RUFISQUE-01',
    nom: 'Veterinaire Rufisque',
    adresse: 'Rufisque, Senegal',
    tel: 'Non renseigne',
    latitude: 14.7156,
    longitude: -17.2736,
  },
];

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

const mapUrl = ({ latitude, longitude, nom, adresse }) => {
  if (latitude && longitude) return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nom || 'veterinaire'} ${adresse || 'Senegal'}`)}`;
};

const normalizeLocalVet = (item, origin) => ({
  ...item,
  external_id: item.id,
  note: 'A verifier',
  gps: item.latitude && item.longitude ? `${item.latitude},${item.longitude}` : '',
  distance_km: item.latitude && item.longitude ? Number(haversineKm(origin, item).toFixed(1)) : null,
  source: 'recherche_locale',
  verified: false,
  favorite: false,
  notes: 'Resultat local de secours: verifier avant utilisation.',
  map_url: mapUrl(item),
});

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
  way["amenity"~"veterinary|clinic|pharmacy",i](around:${radius},${latitude},${longitude});
  node["healthcare"~"veterinary|clinic",i](around:${radius},${latitude},${longitude});
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
  const nom = tags.name || tags.operator || 'Veterinaire / clinique';

  return {
    id: `OSM-${element.type}-${element.id}`,
    external_id: `OSM-${element.type}-${element.id}`,
    nom,
    adresse: address || 'Adresse non renseignee',
    tel: tags.phone || tags['contact:phone'] || tags['contact:mobile'] || 'Non renseigne',
    note: 'Non disponible',
    gps: latitude && longitude ? `${latitude},${longitude}` : '',
    latitude: latitude || null,
    longitude: longitude || null,
    distance_km: latitude && longitude ? Number(haversineKm(origin, coords).toFixed(1)) : null,
    source: 'openstreetmap',
    verified: false,
    favorite: false,
    notes: '',
    map_url: mapUrl({ latitude, longitude, nom, adresse: address }),
  };
};

const fallbackResults = (origin, radiusKm, reason) => {
  const results = curatedSenegalVets
    .map((item) => normalizeLocalVet(item, origin))
    .filter((item) => item.distance_km === null || item.distance_km <= Math.max(radiusKm, 80))
    .sort((a, b) => Number(a.distance_km ?? 999) - Number(b.distance_km ?? 999));

  return {
    source: 'recherche_locale',
    origin,
    radiusKm,
    results,
    message: reason || 'Recherche reelle indisponible. Resultats locaux proposes a verifier.',
    warning: true,
  };
};

export const searchGeoPlaces = async ({ kind = 'veterinaires', latitude, longitude, radiusKm = 30 } = {}) => {
  const origin = latitude && longitude ? { latitude, longitude, source: 'manuel' } : await getCurrentPositionSafe();
  const tokens = kind === 'fournisseurs'
    ? ['aliment betail', 'volaille', 'provenderie', 'poussins', 'couvoir', 'semences', 'engrais', 'materiel agricole', 'irrigation']
    : ['veterinaire', 'veterinary', 'clinique veterinaire', 'cabinet veterinaire', 'pharmacie veterinaire', 'animal clinic'];

  const query = buildOverpassQuery({ latitude: origin.latitude, longitude: origin.longitude, radiusKm, tokens });

  try {
    const response = await fetch(overpassEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ data: query }),
    });

    if (!response.ok) throw new Error('OpenStreetMap indisponible');
    const payload = await response.json();
    const results = (payload.elements || [])
      .map((element) => normalizeOsmElement(element, origin))
      .filter((item) => item.latitude && item.longitude)
      .sort((a, b) => Number(a.distance_km ?? 999) - Number(b.distance_km ?? 999));

    if (!results.length) {
      return fallbackResults(origin, radiusKm, 'Aucun veterinaire geolocalise trouve dans OpenStreetMap. Resultats locaux proposes a verifier.');
    }

    return {
      source: 'openstreetmap',
      origin,
      radiusKm,
      results,
      message: `${results.length} resultats OpenStreetMap trouves autour de la position utilisee.`,
    };
  } catch (error) {
    return fallbackResults(origin, radiusKm, 'Recherche reelle indisponible sur ce navigateur/reseau. Resultats locaux proposes a verifier.');
  }
};
