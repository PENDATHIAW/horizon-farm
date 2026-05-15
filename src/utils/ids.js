export const makeId = (prefix = 'ID') => {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${now}-${rand}`;
};

const animalPrefixMap = {
  Bovin: 'BOV',
  Ovin: 'OV',
  Caprin: 'CAP',
};

const avicolePrefixMap = {
  Pondeuse: 'LOTPO',
  Chair: 'LOTCH',
};

const modulePrefixMap = {
  animaux: 'AN',
  avicole: 'LOT',
  sante: 'VAC',
  veterinaires: 'VET',
  finances: 'TRX',
  comptabilite: 'ACC',
  investissements: 'INV',
  stock: 'STK',
  clients: 'CLI',
  fournisseurs: 'FOU',
  tracabilite: 'TRA',
  cultures: 'CULT',
  ventes: 'VEN',
  documents: 'DOC',
  taches: 'TSK',
  rapports: 'RPT',
  equipements: 'EQP',
  audit_logs: 'LOG',
  alimentation_logs: 'ALIM',
  production_oeufs_logs: 'PROD',
  sensor_devices: 'SENS',
  sensor_readings: 'READ',
  camera_devices: 'CAM',
};

const getPrefix = (moduleKey, values = {}) => {
  if (moduleKey === 'animaux') return animalPrefixMap[values.type] || 'BOV';
  if (moduleKey === 'avicole') return avicolePrefixMap[values.type] || 'LOTPO';
  return modulePrefixMap[moduleKey] || 'ID';
};

export const generateSequentialId = (moduleKey, rows = [], values = {}) => {
  const prefix = getPrefix(moduleKey, values);
  const sameGroup = rows.filter((row) => {
    if (moduleKey === 'animaux') return row.type === (values.type || 'Bovin');
    if (moduleKey === 'avicole') return row.type === (values.type || 'Pondeuse');
    return String(row.id || '').startsWith(prefix);
  });
  const maxFromIds = rows.reduce((max, row) => {
    const id = String(row.id || row.tag || '');
    if (!id.startsWith(prefix)) return max;
    const match = id.match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  const next = Math.max(maxFromIds, sameGroup.length) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
};

export const sanitizePhone = (value = '') => {
  const digits = String(value).replace(/[^\d]/g, '');
  if (digits.length === 9 && digits.startsWith('7')) return `221${digits}`;
  if (digits.length === 8) return `221${digits}`;
  return digits;
};

export const toWhatsappAppLink = (phone = '', message = '') => {
  const clean = sanitizePhone(phone);
  const text = message ? `&text=${encodeURIComponent(message)}` : '';
  return clean ? `whatsapp://send?phone=${clean}${text}` : `whatsapp://send?text=${encodeURIComponent(message || '')}`;
};

export const toWhatsappWebLink = (phone = '', message = '') => {
  const clean = sanitizePhone(phone);
  return `https://wa.me/${clean}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
};

export const toWhatsappLink = (phone = '', message = '') => toWhatsappAppLink(phone, message);
