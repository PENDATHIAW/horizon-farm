const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();

export function extractLiveSensorReadings(sensors = [], meteo = {}) {
  const tempSensors = arr(sensors).filter((s) => low(s.type).includes('temp'));
  const humSensors = arr(sensors).filter((s) => low(s.type).includes('humid') || low(s.type) === 'air');
  const soilSensors = arr(sensors).filter((s) => low(s.type).includes('eau') || low(s.type).includes('sol'));
  const label = (list) => list.map((s) => s.name || s.zone || s.id).filter(Boolean).slice(0, 2).join(', ') || '';

  return {
    tempNow: tempSensors.length ? num(tempSensors[0].value ?? tempSensors[0].last_value) : null,
    humNow: humSensors.length ? num(humSensors[0].value ?? humSensors[0].last_value) : null,
    soilNow: soilSensors.length ? num(soilSensors[0].value ?? soilSensors[0].last_value) : null,
    tempLabel: label(tempSensors),
    humLabel: label(humSensors),
    soilLabel: label(soilSensors),
    tempFallback: meteo?.temp != null ? num(meteo.temp) : null,
    sensorCount: arr(sensors).length,
    onlineCount: arr(sensors).filter((s) => low(s.status) === 'online' || low(s.status) === 'actif').length,
    offlineCount: arr(sensors).filter((s) => ['offline', 'hors_ligne', 'inactive'].includes(low(s.status))).length,
    criticalCount: arr(sensors).filter((s) => {
      const max = num(s.seuil_max ?? s.max_threshold);
      const value = num(s.value ?? s.last_value);
      return max > 0 && value > max;
    }).length,
  };
}

export function buildSensorDashboardSummary(sensors = [], cameras = [], meteo = {}) {
  const live = extractLiveSensorReadings(sensors, meteo);
  const temp = live.tempNow ?? live.tempFallback;
  const alerts = [];
  if (live.offlineCount > 0) alerts.push({ text: `${live.offlineCount} capteur(s) hors ligne` });
  if (live.criticalCount > 0) alerts.push({ text: `${live.criticalCount} seuil(s) dépassé(s)` });

  const lines = [];
  if (temp != null) lines.push({ text: `Température : ${temp}°C${live.tempLabel ? ` · ${live.tempLabel}` : ''}` });
  if (live.humNow != null) lines.push({ text: `Humidité air : ${live.humNow}%${live.humLabel ? ` · ${live.humLabel}` : ''}` });
  if (live.soilNow != null) lines.push({ text: `Humidité sol : ${live.soilNow}%${live.soilLabel ? ` · ${live.soilLabel}` : ''}` });
  if (!lines.length) lines.push({ text: live.sensorCount ? `${live.sensorCount} capteur(s) enregistré(s)` : 'Aucun capteur connecté' });
  if (cameras.length) lines.push({ text: `${cameras.length} caméra(s) surveillée(s)` });

  return {
    ...live,
    tempDisplay: temp,
    lines,
    alerts,
    headline: temp != null ? `${temp}°C` : (live.sensorCount ? `${live.onlineCount || live.sensorCount} capteur(s)` : 'À connecter'),
    hasData: live.sensorCount > 0 || temp != null,
  };
}
