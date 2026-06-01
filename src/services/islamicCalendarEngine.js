/**
 * Calendrier hijri tabulaire (algorithme astronomique standard).
 * Calcule automatiquement Tabaski, Korité, Ramadan, Magal et Gamou pour le marché sénégalais.
 */

export const HIJRI_FESTIVAL_RULES = {
  ramadan: { month: 9, day: 1, label: 'Ramadan' },
  korite: { month: 10, day: 1, label: 'Korité' },
  tabaski: { month: 12, day: 10, label: 'Tabaski' },
  magal: { month: 2, day: 18, label: 'Magal' },
  gamou: { month: 3, day: 12, label: 'Gamou' },
};

export function safeDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function iso(date) {
  return safeDate(date).toISOString().slice(0, 10);
}

function makeDate(year, month, day) {
  return new Date(year, month - 1, day);
}

/** Grégorien → Hijri (année / mois / jour entiers). */
export function gregorianToHijri(gy, gm, gd) {
  let year = Number(gy);
  let month = Number(gm);
  let day = Number(gd);

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;

  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719)
    + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
    - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hm = Math.floor((24 * l3) / 709);
  const hd = Math.max(1, Math.round(l3 - Math.floor((709 * hm) / 24)));
  const hy = 30 * n + j - 30;

  return { hy, hm, hd };
}

/** Hijri → ISO grégorien (YYYY-MM-DD). */
export function hijriToGregorian(hy, hm, hd) {
  const jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm - Math.floor((hm - 1) / 2) + hd + 1948440 - 385;

  if (jd <= 2299160) return null;

  const l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  const l2 = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l2 + 1)) / 1461001);
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l3) / 2447);
  const gd = l3 - Math.floor((2447 * j) / 80);
  const l4 = Math.floor(j / 11);
  const gm = j + 2 - 12 * l4;
  const gy = 100 * (n - 49) + i + l4;

  return iso(makeDate(gy, gm, gd));
}

function hijriYearFromReference(referenceDate = new Date()) {
  const ref = safeDate(referenceDate);
  const { hy } = gregorianToHijri(ref.getFullYear(), ref.getMonth() + 1, ref.getDate());
  return hy;
}

/** Toutes les occurrences de fêtes hijri sur une plage d'années hijri. */
export function computeHijriFestivalsForYears(hijriYears = []) {
  const years = [...new Set(hijriYears.map((y) => Number(y)).filter((y) => Number.isFinite(y)))];
  const events = [];

  years.forEach((hy) => {
    Object.entries(HIJRI_FESTIVAL_RULES).forEach(([key, rule]) => {
      const dateIso = hijriToGregorian(hy, rule.month, rule.day);
      if (!dateIso) return;
      events.push({
        key,
        label: rule.label,
        date: safeDate(dateIso),
        dateIso,
        hijriYear: hy,
        source: 'computed',
      });
    });
  });

  return events.sort((a, b) => a.date - b.date);
}

/** Fin d'année grégorienne (24 décembre). */
export function computeGregorianYearEndFestivals(gregorianYears = []) {
  const years = [...new Set(gregorianYears.map((y) => Number(y)).filter((y) => Number.isFinite(y)))];
  return years.map((gy) => ({
    key: 'fin_annee',
    label: "Fin d'année",
    date: makeDate(gy, 12, 24),
    dateIso: iso(makeDate(gy, 12, 24)),
    gregorianYear: gy,
    source: 'computed',
  }));
}

/**
 * Calcule toutes les fêtes marché pertinentes autour d'une date de référence.
 * Horizon : ±1 an hijri + années grégoriennes courante et suivante.
 */
export function computeSenegalMarketFestivals(referenceDate = new Date(), options = {}) {
  const ref = safeDate(referenceDate);
  const hy = hijriYearFromReference(ref);
  const span = options.hijriYearSpan ?? 2;

  const hijriYears = [];
  for (let offset = -1; offset <= span; offset += 1) {
    hijriYears.push(hy + offset);
  }

  const gregorianYears = [ref.getFullYear(), ref.getFullYear() + 1];
  if (ref.getMonth() >= 10) gregorianYears.push(ref.getFullYear() + 2);

  const events = [
    ...computeHijriFestivalsForYears(hijriYears),
    ...computeGregorianYearEndFestivals(gregorianYears),
  ];

  const seen = new Set();
  return events.filter((event) => {
    const token = `${event.key}:${event.dateIso}`;
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  }).sort((a, b) => a.date - b.date);
}

/** Prochaine date calculée par clé de fête (fenêtre glissante). */
export function getNextComputedFestivalDates(referenceDate = new Date(), horizonDays = 540) {
  const ref = safeDate(referenceDate);
  const cutoff = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const horizon = new Date(cutoff);
  horizon.setDate(horizon.getDate() + horizonDays);

  const byKey = {};
  computeSenegalMarketFestivals(ref).forEach((event) => {
    if (event.date < cutoff || event.date > horizon) return;
    if (!byKey[event.key] || event.date < byKey[event.key].date) {
      byKey[event.key] = event;
    }
  });

  return Object.fromEntries(
    Object.entries(byKey).map(([key, event]) => [key, event.dateIso]),
  );
}

/** Map clé → liste de dates ISO (pour alimenter le moteur). */
export function getComputedFestivalDateList(referenceDate = new Date(), horizonDays = 540) {
  const ref = safeDate(referenceDate);
  const cutoff = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const horizon = new Date(cutoff);
  horizon.setDate(horizon.getDate() + horizonDays);

  return computeSenegalMarketFestivals(ref)
    .filter((event) => event.date >= cutoff && event.date <= horizon);
}

export function formatFestivalDateFr(dateIso = '') {
  if (!dateIso) return '—';
  try {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateIso;
  }
}
