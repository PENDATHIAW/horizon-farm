const arr = (v) => (Array.isArray(v) ? v : []);

export const FESTIVAL_DEFINITIONS = [
  { key: 'tabaski', label: 'Tabaski', activities: ['bovins', 'ovins'] },
  { key: 'korite', label: 'Korité', activities: ['poulets_chair', 'oeufs'] },
  { key: 'magal', label: 'Magal', activities: ['bovins', 'ovins'] },
  { key: 'gamou', label: 'Gamou', activities: ['bovins', 'ovins', 'poulets_chair'] },
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

function makeDate(year, month, day) {
  return new Date(year, month - 1, day);
}

/** Dates indicatives — remplacées par pilotage local ou market_calendar_events. */
export function defaultFestivalDatesForYear(year) {
  return {
    tabaski: iso(makeDate(year, 6, 6)),
    korite: iso(makeDate(year, 3, 20)),
    magal: iso(makeDate(year, 9, 14)),
    gamou: iso(makeDate(year, 10, 5)),
    fin_annee: iso(makeDate(year, 12, 24)),
    ramadan: iso(makeDate(year, 2, 17)),
  };
}

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
      note: 'Date pilotage local.',
      source: 'pilotage',
      skipLaunch: row.skipLaunch,
    }))
    .filter((event) => !Number.isNaN(event.date.getTime()));
}

function defaultEventsForYear(year, pilotageLabels = new Set()) {
  const dates = defaultFestivalDatesForYear(year);
  return FESTIVAL_DEFINITIONS
    .filter((row) => !pilotageLabels.has(norm(row.label)))
    .map((row) => ({
      id: `${row.key}-${year}`,
      key: row.key,
      label: row.label,
      date: safeDate(dates[row.key]),
      activities: row.activities,
      note: 'Date indicative — renseigner le pilotage local.',
      source: 'default',
      skipLaunch: row.skipLaunch,
    }));
}

export function buildAllMarketEvents(referenceDate = new Date(), dataMap = {}) {
  const ref = safeDate(referenceDate);
  const customEvents = arr(dataMap.market_calendar_events || dataMap.marketCalendarEvents)
    .map((event) => ({
      id: event.id || event.code || event.nom,
      key: event.code || norm(event.label || event.nom || event.title),
      label: event.label || event.nom || event.title,
      date: safeDate(event.date || event.target_date || event.date_cible),
      activities: arr(event.activities || event.activites || event.focus),
      note: event.note || event.description || '',
      source: 'custom',
      skipLaunch: false,
    }))
    .filter((event) => event.label && !Number.isNaN(event.date.getTime()));

  const pilotageEvents = pilotageEventsFromSettings(dataMap);
  const pilotageLabels = new Set(pilotageEvents.map((event) => norm(event.label)));
  const defaults = [ref.getFullYear(), ref.getFullYear() + 1]
    .flatMap((year) => defaultEventsForYear(year, pilotageLabels));

  return [...customEvents, ...pilotageEvents, ...defaults]
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

/** Fête déjà passée — ne plus l'afficher dans Cycles ni le calendrier contextuel. */
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
export function contextualizeSeasonalText(text = '', upcomingEvents = [], refDate = new Date()) {
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
