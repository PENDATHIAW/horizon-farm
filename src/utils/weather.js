const weatherLabels = {
  0: 'Ciel degage',
  1: 'Principalement clair',
  2: 'Partiellement nuageux',
  3: 'Couvert',
  45: 'Brouillard',
  48: 'Brouillard givrant',
  51: 'Bruine legere',
  53: 'Bruine moderee',
  55: 'Bruine dense',
  61: 'Pluie faible',
  63: 'Pluie moderee',
  65: 'Pluie forte',
  80: 'Averses faibles',
  81: 'Averses moderees',
  82: 'Averses fortes',
  95: 'Orage',
  96: 'Orage avec grele',
  99: 'Orage violent avec grele',
};

export const weatherCodeToLabel = (code) => weatherLabels[Number(code)] || 'Conditions locales';

export const windDirectionLabel = (degrees = 0) => {
  const dirs = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
  return dirs[Math.round(Number(degrees || 0) / 45) % 8];
};

const getThermalLabel = (temp, apparentTemp) => {
  const t = Number(apparentTemp ?? temp);
  if (t >= 38) return 'chaleur extreme';
  if (t >= 32) return 'chaud';
  if (t <= 18) return 'frais';
  if (t <= 14) return 'froid';
  return 'doux';
};

const getRiskLevel = ({ temp, humidite, precipitation, windSpeed, weatherCode, isDay }) => {
  const code = Number(weatherCode || 0);
  if (code >= 95 || Number(windSpeed || 0) >= 45 || Number(precipitation || 0) >= 8) return 'critique';
  if (Number(temp || 0) >= 35 || Number(humidite || 0) >= 90 || Number(windSpeed || 0) >= 30 || Number(precipitation || 0) >= 2) return 'eleve';
  if (!isDay && Number(humidite || 0) >= 82) return 'surveillance';
  return 'stable';
};

export const buildWeatherAnalysis = ({
  temp,
  apparentTemp,
  humidite,
  precipitation,
  rain,
  showers,
  precipitationProbability,
  weatherCode,
  cloudCover,
  windSpeed,
  windDirection,
  isDay,
  sunrise,
  sunset,
  latitude,
  longitude,
  locationLabel = 'Senegal',
  updatedAt,
}) => {
  const pluie = Number(precipitation || 0) > 0 || Number(rain || 0) > 0 || Number(showers || 0) > 0 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(Number(weatherCode || 0));
  const thermalLabel = getThermalLabel(temp, apparentTemp);
  const condition = weatherCodeToLabel(weatherCode);
  const windLabel = `${Math.round(Number(windSpeed || 0))} km/h ${windDirectionLabel(windDirection)}`;
  const riskLevel = getRiskLevel({ temp, humidite, precipitation, windSpeed, weatherCode, isDay });
  const moment = isDay ? 'Jour' : 'Nuit';

  const alerts = [
    pluie && 'Pluie detectee: eviter les traitements foliaires, verifier drainage et litiere.',
    Number(windSpeed || 0) >= 30 && 'Vent fort: securiser baches, portes, toitures legeres et eviter pulverisation.',
    Number(temp || 0) >= 32 && 'Chaleur: augmenter abreuvement, ventilation et surveillance des lots avicoles.',
    Number(temp || 0) <= 18 && 'Fraicheur: proteger poussins/animaux fragiles et limiter les courants d air.',
    Number(humidite || 0) >= 88 && 'Humidite elevee: risque de moisissures, coccidiose, maladies fongiques et stress sanitaire.',
    !isDay && Number(humidite || 0) >= 82 && 'Nuit humide: controler condensation, litiere et aeration au lever du jour.',
  ].filter(Boolean);

  const recommendations = [
    pluie ? 'Reporter arrosage si le sol est deja humide et inspecter les zones de stagnation.' : 'Arrosage possible selon besoin culture, idealement matin ou fin de journee.',
    Number(windSpeed || 0) >= 25 ? 'Ne pas epandre/pulveriser maintenant: derive probable avec le vent.' : 'Fenetre correcte pour interventions terrain si le sol est praticable.',
    Number(temp || 0) >= 30 ? 'Mettre l eau a volonte, reduire stress de manipulation et surveiller mortalite.' : 'Conditions thermiques acceptables pour les routines terrain.',
    Number(humidite || 0) >= 85 ? 'Renforcer hygiene, ventilation et controle maladies sur cultures et volailles.' : 'Humidite sous controle, maintenir surveillance normale.',
    isDay ? 'Prioriser observations visuelles, recolte et maintenance exterieure.' : 'Mode nuit: limiter interventions lourdes, surveiller securite et temperature batiments.',
  ];

  return {
    temp: Math.round(Number(temp || 0)),
    apparentTemp: Math.round(Number(apparentTemp ?? temp ?? 0)),
    humidite: Math.round(Number(humidite || 0)),
    pluie,
    precipitation: Number(precipitation || 0),
    precipitationProbability: Math.round(Number(precipitationProbability || 0)),
    rain: Number(rain || 0),
    showers: Number(showers || 0),
    weatherCode: Number(weatherCode || 0),
    cloudCover: Math.round(Number(cloudCover || 0)),
    windSpeed: Math.round(Number(windSpeed || 0)),
    windDirection: Math.round(Number(windDirection || 0)),
    windLabel,
    isDay: Boolean(isDay),
    moment,
    sunrise,
    sunset,
    condition,
    thermalLabel,
    riskLevel,
    alerts,
    recommendations,
    latitude,
    longitude,
    locationLabel,
    updatedAt: updatedAt || new Date().toISOString(),
    impact: `${moment} - ${condition}, ${thermalLabel}, vent ${windLabel}. ${alerts[0] || 'Conditions stables pour les operations terrain.'}`,
  };
};
