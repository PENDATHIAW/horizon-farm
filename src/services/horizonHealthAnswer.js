const arr = (value) => Array.isArray(value) ? value : [];
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const fmtDate = (value) => value ? new Date(value).toLocaleDateString('fr-FR') : 'Date non précisée';

function isClosed(row = {}) {
  return /(termine|terminé|done|fait|resolu|résolu|clos|closed)/.test(norm(row.status || row.statut || row.etat));
}

function healthLabel(row = {}) {
  return row.animal_name || row.animal || row.subject || row.lot || row.lot_name || row.nom || row.name || row.title || row.type || 'Cas santé';
}

function healthDetail(row = {}) {
  return row.symptomes || row.symptoms || row.diagnostic || row.description || row.observation || row.notes || row.traitement || row.treatment || row.status || row.statut || 'À vérifier';
}

function collectHealthRows(dataMap = {}) {
  const directHealth = arr(dataMap.sante).map((row) => ({ source: 'Santé', row }));
  const animalHealth = [...arr(dataMap.animaux), ...arr(dataMap.bovins), ...arr(dataMap.avicole)]
    .filter((row) => /(malade|sick|soin|sante|santé|vaccin|traitement|febar|feebar|mortal|alerte)/.test(norm(Object.values(row || {}).join(' '))))
    .map((row) => ({ source: row.espece || row.category || row.type || 'Animaux', row }));
  const alerts = [...arr(dataMap.alertes_center), ...arr(dataMap.alertes)]
    .filter((row) => /(sante|santé|malade|soin|vaccin|mortal|animal|feebar|febar)/.test(norm(Object.values(row || {}).join(' '))))
    .map((row) => ({ source: 'Alertes', row }));
  return [...directHealth, ...animalHealth, ...alerts]
    .filter(({ row }) => !isClosed(row))
    .slice(0, 8);
}

export function isHealthQuestion(message = '') {
  const clean = norm(message);
  return /(kan|kaan|qui|kou|ku|moo|mo).*(febar|feebar|malade|sick)|(?:febar|feebar|malade|sante|santé|soin|vaccin|mortalite|mortalité)/.test(clean);
}

export function buildHealthAnswer(message = '', dataMap = {}) {
  if (!isHealthQuestion(message)) return null;
  const rows = collectHealthRows(dataMap);
  const wolof = /(kan|kaan|kou|ku|moo|mo|febar|feebar)/.test(norm(message));
  if (!rows.length) {
    return {
      intent: 'query_health',
      language: wolof ? 'wo' : 'fr',
      text: wolof ? 'Léegi gisuma cas feebar bu oppeeku ci ERP bi. Su am animal bu metti, mënees na bind soin walla alerte.' : 'Je ne vois aucun cas santé ouvert dans l’ERP pour le moment. Si un animal est malade, on peut créer un soin ou une alerte.',
      dataCard: { title: 'Santé', rows: [{ label: 'Cas ouverts', value: '0' }, { label: 'Suite possible', value: wolof ? 'Créer soin / alerte' : 'Créer un soin ou une alerte' }] },
      quickReplies: [{ label: wolof ? 'Créer soin' : 'Créer un soin' }, { label: wolof ? 'Voir alertes' : 'Voir alertes' }],
    };
  }
  return {
    intent: 'query_health',
    language: wolof ? 'wo' : 'fr',
    text: wolof ? `Maa ngi seet. Gis naa ${rows.length} cas santé bu oppeeku.` : `J’ai trouvé ${rows.length} cas santé ouvert(s).`,
    dataCard: {
      title: wolof ? 'Ñi wara toppatoo' : 'Cas santé ouverts',
      rows: rows.slice(0, 5).map(({ source, row }) => ({
        label: `${source} · ${healthLabel(row)}`,
        value: `${healthDetail(row)} · ${fmtDate(row.date || row.created_at || row.updated_at || row.echeance)}`,
      })),
    },
    quickReplies: [{ label: wolof ? 'Détail bi' : 'Voir détail' }, { label: wolof ? 'Marquer soin fait' : 'Marquer soin fait' }, { label: wolof ? 'Créer tâche' : 'Créer tâche' }],
  };
}
