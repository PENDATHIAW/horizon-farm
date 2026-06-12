/**
 * Réponses météo assistant — lecture seule via dataMap.meteo (Open-Meteo / useLiveWeather).
 */

const RISK_LABELS = Object.freeze({
  stable: 'stable',
  surveillance: 'à surveiller',
  eleve: 'élevé',
  critique: 'critique',
});

function safeMeteo(dataMap = {}) {
  return dataMap.meteo || dataMap.weather || null;
}

export function buildWeatherAnswer(intent = 'weather_now', dataMap = {}) {
  const meteo = safeMeteo(dataMap);
  if (!meteo) {
    return {
      title: 'Météo',
      situation: 'Je n\'ai pas encore de données météo pour votre ferme.',
      cause: 'La météo live se charge depuis Open-Meteo (position ferme ou Dakar par défaut).',
      action: 'Réessayez dans un instant ou consultez l\'onglet Intrants & Météo dans Cultures.',
      sources: ['useLiveWeather'],
      confidence: 55,
    };
  }

  const temp = meteo.temp ?? meteo.temperature;
  const humidity = meteo.humidite ?? meteo.humidity;
  const condition = meteo.condition || meteo.description || 'Conditions locales';
  const wind = meteo.windLabel || (meteo.wind != null ? `${meteo.wind} km/h` : null);
  const risk = meteo.riskLevel || 'stable';
  const riskLabel = RISK_LABELS[risk] || risk;
  const location = meteo.locationLabel || meteo.localisation || 'votre exploitation';
  const impact = meteo.impact || '';
  const recommendations = Array.isArray(meteo.recommendations) ? meteo.recommendations : [];

  if (intent === 'weather_risk') {
    const alerts = Array.isArray(meteo.alerts) ? meteo.alerts : [];
    return {
      title: 'Risques météo',
      situation: `Niveau de risque : ${riskLabel}${temp != null ? ` · ${temp}°C` : ''}${humidity != null ? ` · ${humidity}% d'humidité` : ''}.`,
      cause: alerts[0] || impact || (risk === 'stable' ? 'Pas d\'alerte météo majeure pour l\'instant.' : 'Conditions à prendre en compte pour élevage et cultures.'),
      action: recommendations[0] || (risk !== 'stable' ? 'Vérifiez abreuvement, ventilation et parcelles sensibles.' : 'Poursuivez vos routines terrain normalement.'),
      sources: ['useLiveWeather', 'buildWeatherAnalysis'],
      confidence: 88,
    };
  }

  if (intent === 'weather_forecast') {
    return {
      title: 'Prévisions',
      situation: `${condition}${temp != null ? ` · ${temp}°C ressenti ${meteo.apparentTemp ?? temp}°C` : ''}.`,
      cause: [
        meteo.pluie || meteo.precipitation > 0 ? 'Pluie ou précipitations signalées.' : null,
        meteo.precipitationProbability > 30 ? `Probabilité de pluie : ${meteo.precipitationProbability}%.` : null,
        meteo.sunrise && meteo.sunset ? `Lever ${meteo.sunrise} · Coucher ${meteo.sunset}.` : null,
      ].filter(Boolean).join(' ') || `Données pour ${location}.`,
      action: recommendations.slice(0, 2).join(' ') || 'Adaptez arrosage et interventions selon le vent et la pluie.',
      sources: ['useLiveWeather'],
      confidence: 86,
    };
  }

  return {
    title: 'Météo actuelle',
    situation: [
      temp != null ? `${temp}°C` : null,
      condition,
      humidity != null ? `${humidity}% humidité` : null,
      wind,
    ].filter(Boolean).join(' · ') || condition,
    cause: impact || `Source : ${meteo.source || 'météo live'} · risque ${riskLabel}.`,
    action: recommendations[0] || (risk !== 'stable' ? 'Consultez les alertes dashboard et adaptez vos priorités du jour.' : 'Bonne fenêtre pour les routines terrain si le sol est praticable.'),
    sources: ['useLiveWeather', 'buildWeatherAnalysis'],
    confidence: 90,
  };
}

export default buildWeatherAnswer;
