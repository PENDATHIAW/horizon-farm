export const fmtCurrency = (value = 0) => {
  // Le FCFA n'a pas de sous-unité : on arrondit toujours à l'entier pour
  // éviter les décimales parasites (ex. « -3 599 183,333 FCFA »).
  const n = Math.round(Number(value) || 0);
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} FCFA`;
};

export const fmtNumber = (value = 0) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('fr-FR').format(n);
};

export const fmtPercent = (value = 0, digits = 1) => {
  const n = Number(value) || 0;
  return `${n.toFixed(digits)}%`;
};

export const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const toDateInput = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

export const titleize = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());


