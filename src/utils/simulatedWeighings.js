/**
 * Pesées SIMULÉES : une vraie série de poids dans le temps par sujet, pour
 * remplir la « courbe de pesée » de la fiche tant qu'aucune balance connectée
 * n'est branchée. Déterministe (stable par sujet) et à la même forme qu'une
 * table `weighings` réelle ({ date, poids }) — prête à recevoir de vraies
 * saisies ou les relevés d'une balance 4G.
 */

const clean = (v) => String(v ?? '').toLowerCase();
function seed(str = '', salt = 0) {
  let h = 2166136261 ^ salt;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}
const round = (n, d = 0) => { const p = 10 ** d; return Math.round(n * p) / p; };
const isRuminant = (a = {}) => ['bovin', 'boeuf', 'bœuf', 'vache', 'taureau', 'veau', 'zebu', 'mouton', 'ovin', 'chevre', 'chèvre', 'caprin']
  .some((k) => clean(`${a.type} ${a.espece} ${a.categorie} ${a.race}`).includes(k));

function weekLabels(n) {
  const out = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now - i * 7 * 86400000);
    out.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, iso: d.toISOString().slice(0, 10) });
  }
  return out;
}

/**
 * Série de pesées d'un sujet.
 * @returns { points:[{date,label,poids}], last, first, gmq, unit, gainTotal }
 */
export function weighingSeries(target = {}, mode = 'animaux') {
  const id = target.id || target.boucle_numero || target.tag || target.name || 'sujet';

  if (mode === 'avicole') {
    // Poulet de chair : ~6 semaines, croissance rapide (kg).
    const weeks = weekLabels(6);
    const gainFactor = 0.9 + seed(id, 3) * 0.3;
    const ref = [0.05, 0.18, 0.5, 0.95, 1.5, 2.1];
    const points = weeks.map((w, i) => ({ date: w.iso, label: w.label, poids: round(ref[i] * gainFactor + (seed(id, i + 10) - 0.5) * 0.08, 2) }));
    const last = points[points.length - 1].poids;
    const first = points[0].poids;
    return { points, last, first, gmq: round(((last - first) * 1000) / (weeks.length * 7), 0), unit: 'kg', gainTotal: round(last - first, 2), subject: 'poids moyen du lot' };
  }

  // Ruminants / autres animaux : 12 semaines (kg).
  const weeks = weekLabels(12);
  const start = Math.round(120 + seed(id, 1) * 140);
  const gainPerDay = 0.55 + seed(id, 2) * 0.75; // 0.55–1.3 kg/j
  const points = weeks.map((w, i) => ({
    date: w.iso, label: w.label,
    poids: Math.round(start + gainPerDay * 7 * i + (seed(id, i + 20) - 0.5) * 6),
  }));
  const last = points[points.length - 1].poids;
  const first = points[0].poids;
  const days = (weeks.length - 1) * 7;
  return {
    points, last, first, unit: 'kg',
    gmq: round((last - first) / Math.max(1, days), 2),
    gainTotal: last - first,
    subject: isRuminant(target) ? 'poids de l’animal' : 'poids',
  };
}

export default weighingSeries;
