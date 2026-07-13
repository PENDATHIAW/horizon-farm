import {
  computeSenegalMarketFestivals,
  getComputedFestivalDateList,
} from './islamicCalendarEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export const FESTIVAL_DEFINITIONS = [
  { key: 'tabaski', label: 'Tabaski', activities: ['bovins', 'ovins', 'poulets_chair', 'oeufs'] },
  { key: 'korite', label: 'Korité', activities: ['poulets_chair', 'oeufs'] },
  { key: 'magal', label: 'Magal', activities: ['bovins', 'ovins', 'poulets_chair', 'oeufs'] },
  { key: 'gamou', label: 'Gamou', activities: ['bovins', 'ovins', 'poulets_chair', 'oeufs'] },
  { key: 'fin_annee', label: "Fin d'année", activities: ['poulets_chair', 'oeufs', 'bovins', 'ovins'] },
  { key: 'ramadan', label: 'Ramadan', activities: ['poulets_chair', 'oeufs'], skipLaunch: true },
];

const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export function safeDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function dateOnly(date) {
  const d = safeDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function iso(date) {
  return safeDate(date).toISOString().slice(0, 10);
}

export function addDays(date, days) {
  const next = safeDate(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

export function daysBetween(a, b) {
  return Math.ceil((dateOnly(b).getTime() - dateOnly(a).getTime()) / 86400000);
}

const definitionByKey = Object.fromEntries(FESTIVAL_DEFINITIONS.map((row) => [row.key, row]));

function pilotageEventsFromSettings(dataMap = {}) {
  const fd = dataMap.growth_settings?.festival_dates || {};
  return FESTIVAL_DEFINITIONS
    .filter((row) => fd[row.key])
    .map((row) => ({
      id: `pilotage-${row.key}-${fd[row.key]}`,
      key: row.key,
      label: row.label,
      date: safeDate(fd[row.key]),
      activities: row.activities,
      note: 'Date ajustée manuellement (pilotage).',
      source: 'pilotage',
      skipLaunch: row.skipLaunch,
    }))
    .filter((event) => !Number.isNaN(event.date.getTime()));
}

function computedEventsFromEngine(referenceDate = new Date(), overriddenKeys = new Set()) {
  const ref = safeDate(referenceDate);
  const horizonDays = 540;

  return getComputedFestivalDateList(ref, horizonDays)
    .filter((event) => !overriddenKeys.has(event.key))
    .map((event) => {
      const def = definitionByKey[event.key] || {};
      return {
        id: `computed-${event.key}-${event.dateIso}`,
        key: event.key,
        label: def.label || event.label,
        date: event.date,
        activities: def.activities || [],
        note: 'Date calculée automatiquement (calendrier hijri).',
        source: 'computed',
        skipLaunch: def.skipLaunch,
      };
    });
}

export function buildAllMarketEvents(referenceDate = new Date(), dataMap = {}) {
  const ref = safeDate(referenceDate);

  const customEvents = arr(dataMap.market_calendar_events || dataMap.marketCalendarEvents)
    .map((event) => ({
      id: event.id || event.code || event.nom,
      key: event.code || matchFestivalKey(event.label || event.nom || event.title) || norm(event.label || event.nom || event.title),
      label: event.label || event.nom || event.title,
      date: safeDate(event.date || event.target_date || event.date_cible),
      activities: arr(event.activities || event.activites || event.focus),
      note: event.note || event.description || '',
      source: 'custom',
      skipLaunch: false,
    }))
    .filter((event) => event.label && !Number.isNaN(event.date.getTime()));

  const pilotageEvents = pilotageEventsFromSettings(dataMap);
  const overriddenKeys = new Set([
    ...customEvents.map((event) => event.key).filter(Boolean),
    ...pilotageEvents.map((event) => event.key).filter(Boolean),
  ]);

  const computedEvents = computedEventsFromEngine(ref, overriddenKeys);

  const seen = new Set();
  return [...customEvents, ...pilotageEvents, ...computedEvents]
    .filter((event) => {
      const token = `${event.key}:${iso(event.date)}`;
      if (seen.has(token)) return false;
      seen.add(token);
      return true;
    })
    .sort((a, b) => a.date - b.date);
}

/** Fêtes encore à venir (fenêtre commerciale / lancement). */
export function getUpcomingMarketEvents(referenceDate = new Date(), dataMap = {}, options = {}) {
  const ref = safeDate(referenceDate);
  const horizonDays = options.horizonDays ?? 540;
  const includeToday = options.includeToday !== false;
  const cutoff = includeToday ? dateOnly(ref) : addDays(ref, 1);

  return buildAllMarketEvents(ref, dataMap)
    .filter((event) => event.date >= cutoff && event.date <= addDays(ref, horizonDays));
}

/** Fête déjà passée - ne plus l'afficher dans Cycles ni le calendrier contextuel. */
export function isPastFestival(event = {}, referenceDate = new Date(), graceDays = 1) {
  if (!event?.date) return true;
  return daysBetween(referenceDate, event.date) < -graceDays;
}

export function getNextFestivals(referenceDate = new Date(), dataMap = {}, limit = 4) {
  return getUpcomingMarketEvents(referenceDate, dataMap, { horizonDays: 400 }).slice(0, limit);
}

export function festivalLabelList(events = []) {
  return events.map((event) => event.label).filter(Boolean);
}

const PAST_FESTIVAL_PATTERNS = [/tabaski/i, /korite/i, /korité/i, /ramadan/i];

/** Retire les mentions de fêtes passées dans un texte statique (calendrier mensuel). */
export function contextualizeSeasonalText(text = '', upcomingEvents = []) {
  const upcoming = new Set(upcomingEvents.map((event) => norm(event.label)));
  const upcomingKeys = new Set(upcomingEvents.map((event) => event.key).filter(Boolean));

  let output = String(text || '');
  FESTIVAL_DEFINITIONS.forEach((fest) => {
    const isUpcoming = upcoming.has(norm(fest.label)) || upcomingKeys.has(fest.key);
    if (isUpcoming) return;
    const regex = new RegExp(fest.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    output = output.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
  });

  PAST_FESTIVAL_PATTERNS.forEach((pattern) => {
    if (pattern.test(output) && !upcomingEvents.some((event) => pattern.test(event.label || ''))) {
      output = output.replace(pattern, '').replace(/\s{2,}/g, ' ').trim();
    }
  });

  if (!output || output.length < 8) {
    const nextLabels = festivalLabelList(upcomingEvents.slice(0, 2));
    if (nextLabels.length) return `Préparer les prochaines fenêtres : ${nextLabels.join(', ')}.`;
  }
  return output;
}

export function matchFestivalKey(label = '') {
  const text = norm(label);
  return FESTIVAL_DEFINITIONS.find((fest) => text.includes(norm(fest.label)))?.key || null;
}

/** Dates calculées pour affichage UI (sans surcharge pilotage). */
export function getAutoFestivalSchedule(referenceDate = new Date(), dataMap = {}) {
  const ref = safeDate(referenceDate);


  const computed = computeSenegalMarketFestivals(ref);
  const upcoming = getUpcomingMarketEvents(ref, dataMap, { horizonDays: 400 });

  return FESTIVAL_DEFINITIONS.map((fest) => {
    const override = dataMap.growth_settings?.festival_dates?.[fest.key];
    const nextAuto = upcoming.find((event) => event.key === fest.key && event.source === 'computed')
      || computed.find((event) => event.key === fest.key && event.date >= dateOnly(ref));
    const nextAny = upcoming.find((event) => event.key === fest.key);

    return {
      key: fest.key,
      label: fest.label,
      autoDate: nextAuto?.date ? iso(nextAuto.date) : (computed.find((e) => e.key === fest.key)?.dateIso || ''),
      activeDate: nextAny ? iso(nextAny.date) : '',
      overridden: Boolean(override),
      overrideDate: override || '',
    };
  });
}
