const nowIso = () => new Date().toISOString();
const fmtNumber = (value) => Number(value || 0).toLocaleString('fr-FR');
const fmtMoney = (value) => `${fmtNumber(value)} FCFA`;
const textOf = (value) => String(value || '').trim();
const norm = (value = '') => textOf(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const arr = (value) => Array.isArray(value) ? value : [];
const id = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const MODULE_LABELS = {
  animaux: 'Animaux',
  avicole: 'Avicole',
  sante: 'Santé',
  finances: 'Finances',
  stock: 'Stock',
  clients: 'Clients',
  fournisseurs: 'Fournisseurs',
  ventes: 'Ventes',
  sales_orders: 'Ventes',
  payments: 'Paiements',
  invoices: 'Factures',
  documents: 'Documents',
  taches: 'Tâches',
  alertes_center: 'Alertes',
  sensor_devices: 'Capteurs',
  camera_devices: 'Caméras',
  business_events: 'Activité ferme',
  cultures: 'Cultures',
  equipements: 'Équipements',
};

function detectLanguage(message = '') {
  const clean = norm(message);
  if (/\b(naka|na nga|jamm|ndax|lan|looy|dafa|am na|des na|bi|yi|waaw|déedéet|doy|xam|ma def|jafe|ñu|benn|ñaar)\b/.test(clean)) return 'wo';
  if (/\b(how|what|which|show|give|today|stock|sales|customer|money|paid|unpaid|humidity|temperature|camera|alert)\b/.test(clean)) return 'en';
  return 'fr';
}

function t(lang, key, values = {}) {
  const dict = {
    fr: {
      cancelled: 'D’accord, je n’ai rien enregistré.',
      fallback: 'Je peux répondre sur les ventes, les stocks, la ponte, les clients, les paiements, les soins, les tâches, les alertes, les capteurs, les caméras et les documents. Pose-moi la question simplement.',
      confirmAsk: 'Tu confirmes ?',
      noStock: 'Je ne vois pas encore de stock exploitable.',
      noCredits: 'Je ne vois pas de créance client importante pour le moment.',
      noEgg: 'Je ne vois pas encore de ponte récente enregistrée.',
      salePrepared: `Je prépare une vente de ${values.qty || 0} tablette(s) pour ${values.client || 'client comptoir'}. Je l’enregistre seulement si tu confirmes.`,
      eggPrepared: `Je peux enregistrer ${values.qty || 0} œufs pour aujourd’hui. Je mets à jour la ponte après confirmation.`,
      orderPrepared: `Je peux préparer une commande de ${values.qty || 0} sac(s). Elle restera en brouillon après confirmation.`,
      sensorOk: 'Je ne vois pas d’alerte capteur critique pour le moment.',
    },
    en: {
      cancelled: 'Okay, I did not save anything.',
      fallback: 'I can answer questions about sales, stock, egg collection, customers, payments, health, tasks, alerts, sensors, cameras and documents. Ask me naturally.',
      confirmAsk: 'Do you confirm?',
      noStock: 'I cannot see usable stock yet.',
      noCredits: 'I do not see any important customer debt right now.',
      noEgg: 'I cannot see a recent egg collection yet.',
      salePrepared: `I am preparing a sale of ${values.qty || 0} tray(s) for ${values.client || 'walk-in customer'}. I will save it only if you confirm.`,
      eggPrepared: `I can save ${values.qty || 0} eggs for today. I will update production after confirmation.`,
      orderPrepared: `I can prepare an order for ${values.qty || 0} bag(s). It will stay as a draft after confirmation.`,
      sensorOk: 'I do not see any critical sensor alert right now.',
    },
    wo: {
      cancelled: 'Baax na, duma dara bind.',
      fallback: 'Man naa laa dimbali ci vente yi, stock bi, ponte bi, clients yi, xaalis bi, soins yi, tâches yi, alertes yi, capteurs yi ak caméras yi. Laajal ma rekk.',
      confirmAsk: 'Ndax nga dëggal?',
      noStock: 'Gisuma stock bu leer léegi.',
      noCredits: 'Gisuma client bu am bor bu am solo léegi.',
      noEgg: 'Gisuma ponte bu bees léegi.',
      salePrepared: `Maa ngi waajal vente bu ${values.qty || 0} tablette(s) ngir ${values.client || 'client comptoir'}. Dinaa ko bind su fekkee nga dëggal.`,
      eggPrepared: `Man naa bind ${values.qty || 0} nen yu tey. Dinaa yeesal ponte bi su fekkee nga dëggal.`,
      orderPrepared: `Man naa waajal commande bu ${values.qty || 0} sac(s). Dina des brouillon gannaaw dëggal.`,
      sensorOk: 'Gisuma alerte capteur bu metti léegi.',
    },
  };
  return dict[lang]?.[key] || dict.fr[key] || key;
}

function card(title, rows = []) {
  return { title, rows: rows.filter((row) => row?.label && row?.value !== undefined && row?.value !== null).slice(0, 5) };
}

function quick(lang, ...items) {
  const defaults = {
    fr: ['Stock aliment', 'Ponte du jour', 'Créances', 'Alertes capteurs'],
    en: ['Feed stock', 'Today eggs', 'Customer debts', 'Sensor alerts'],
    wo: ['Stock aliment bi', 'Ponte bi', 'Bor clients yi', 'Alertes capteurs yi'],
  };
  return (items.length ? items : defaults[lang] || defaults.fr).filter(Boolean).map((label) => ({ label }));
}

function parseNumber(message, fallback = 0) {
  const match = norm(message).match(/(\d+[\s\d]*(?:[,.]\d+)?)/);
  if (!match) return fallback;
  return Number(match[1].replace(/\s/g, '').replace(',', '.')) || fallback;
}

function detectIntent(message = '') {
  const clean = norm(message);
  if (/\b(confirm|confirme|confirmer|dëggal|waaw|ok|yes)\b/.test(clean)) return 'confirm_action';
  if (/\b(annul|cancel|déedéet|deedeet|non)\b/.test(clean)) return 'cancel_action';
  if (/(temperature|température|thermique|chaleur|humidity|humidite|humidité|capteur|sensor|camera|caméra|mouvement|vision)/.test(clean)) return 'query_sensors';
  if (/(ramass|ponte|oeuf|œuf|egg|nen)/.test(clean) && /\d/.test(clean)) return 'log_egg_collection';
  if (/(vente|vendu|vendre|tablette|tray|sell|sold|client)/.test(clean) && /\d/.test(clean)) return 'log_sale';
  if (/(stock|reste|aliment|feed|sac|doy)/.test(clean)) return 'query_stock';
  if (/(ponte|oeuf|œuf|egg|nen)/.test(clean)) return 'query_egg';
  if (/(creance|créance|doit|dette|argent|bor|debt|unpaid|owes|payer)/.test(clean)) return 'query_credits';
  if (/(vente|sales|chiffre|recette|caisse|money|cash|xaalis)/.test(clean)) return 'query_sales';
  if (/(alerte|alert|urgence|risk|risque|problème|probleme)/.test(clean)) return 'query_alerts';
  if (/(tache|tâche|task|liggey|travail)/.test(clean)) return 'query_tasks';
  if (/(document|facture|invoice|preuve|photo)/.test(clean)) return 'query_documents';
  if (/(vaccin|soin|health|sante|santé|malade)/.test(clean) && /(fait|termine|terminé|done|realise|réalisé)/.test(clean)) return 'mark_health_done';
  if (/(commande|order|supplier|fournisseur)/.test(clean) && /\d/.test(clean)) return 'create_order';
  return 'global_search';
}

function getAmount(row = {}) {
  return Number(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.paid_amount ?? 0) || 0;
}

function getPaid(row = {}) {
  return Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.montant ?? 0) || 0;
}

function getRemaining(row = {}) {
  return Math.max(0, Number(row.reste_a_payer ?? row.remaining_amount ?? row.amount_due ?? (getAmount(row) - getPaid(row)) ?? 0) || 0);
}

function buildStats(dataMap = {}) {
  const sales = [...arr(dataMap.sales_orders), ...arr(dataMap.ventes)];
  const payments = arr(dataMap.payments);
  const finances = arr(dataMap.finances);
  const productions = arr(dataMap.production_oeufs_logs);
  const stocks = arr(dataMap.stock);
  const tasks = arr(dataMap.taches);
  const alerts = [...arr(dataMap.alertes_center), ...arr(dataMap.alertes)];
  const caisse = payments.reduce((sum, row) => sum + getPaid(row), 0) || finances.filter((row) => norm(row.type).includes('entree')).reduce((sum, row) => sum + getAmount(row), 0);
  const latestPonte = productions[0]?.quantity || productions[0]?.quantite || productions[0]?.nombre_oeufs || productions[0]?.oeufs_produits || productions[0]?.eggs_count || 0;
  const stockCritique = stocks.filter((row) => Number(row.seuil || 0) > 0 && Number(row.quantite || 0) <= Number(row.seuil || 0)).length;
  const taches = tasks.filter((row) => !['termine', 'terminé', 'done', 'fait'].includes(norm(row.status || row.statut))).length;
  const alertes = alerts.filter((row) => !['termine', 'terminé', 'done', 'resolue', 'résolue'].includes(norm(row.status || row.statut))).length;
  const creances = sales.reduce((sum, row) => sum + getRemaining(row), 0) + arr(dataMap.clients).reduce((sum, row) => sum + Number(row.creance || row.reste_a_payer || row.dette || 0), 0);
  return { caisse, latestPonte, stockCritique, taches, alertes, creances };
}

function sensorAlerts(dataMap = {}) {
  const alerts = [];
  arr(dataMap.sensor_devices).forEach((sensor) => {
    const temp = Number(sensor.temperature ?? sensor.temp ?? sensor.last_temperature ?? 0);
    const humidity = Number(sensor.humidity ?? sensor.humidite ?? sensor.last_humidity ?? 0);
    const zone = sensor.zone || sensor.location || sensor.nom || sensor.name || 'Zone capteur';
    if (temp >= 32) alerts.push({ id: `temp-${sensor.id || zone}`, type: 'sensor_alert', title: 'Température élevée', text: `${zone}: ${temp}°C`, prompt: `Température élevée ${zone} ${temp} degrés`, severity: 'warning' });
    if (humidity >= 78) alerts.push({ id: `hum-${sensor.id || zone}`, type: 'sensor_alert', title: 'Humidité élevée', text: `${zone}: ${humidity}%`, prompt: `Humidité élevée ${zone} ${humidity}%`, severity: 'warning' });
  });
  arr(dataMap.camera_devices).forEach((camera) => {
    const status = norm(camera.status || camera.statut || camera.last_event || camera.event_type);
    const name = camera.zone || camera.location || camera.nom || camera.name || 'Caméra';
    if (/(mouvement|motion|intrusion|alerte|offline|hors)/.test(status)) alerts.push({ id: `cam-${camera.id || name}`, type: 'camera_alert', title: 'Caméra à vérifier', text: `${name}: ${camera.last_event || camera.status || 'événement détecté'}`, prompt: `Alerte caméra ${name}`, severity: 'warning' });
  });
  arr(dataMap.alertes_center).forEach((alert) => {
    const text = `${alert.title || ''} ${alert.message || ''} ${alert.description || ''}`;
    if (/(temp|humid|camera|caméra|capteur|mouvement)/i.test(text)) alerts.push({ id: `alerte-${alert.id}`, type: /camera|caméra/i.test(text) ? 'camera_alert' : 'sensor_alert', title: alert.title || 'Alerte terrain', text: alert.message || alert.description || 'Alerte à vérifier', prompt: alert.title || alert.message || 'Alerte capteur', severity: alert.severity || 'warning' });
  });
  return alerts.slice(0, 8);
}

function findStock(dataMap = {}, keyword = 'aliment') {
  const stocks = arr(dataMap.stock);
  const clean = norm(keyword);
  return stocks.find((row) => norm(`${row.produit || row.name || row.nom || ''}`).includes(clean)) || stocks[0];
}

function latestEgg(dataMap = {}) {
  return arr(dataMap.production_oeufs_logs)[0];
}

function creditRows(dataMap = {}) {
  const clients = arr(dataMap.clients).filter((row) => Number(row.creance || row.reste_a_payer || row.dette || 0) > 0).map((row) => ({ name: row.nom || row.name || row.client || 'Client', amount: Number(row.creance || row.reste_a_payer || row.dette || 0) }));
  const orders = [...arr(dataMap.sales_orders), ...arr(dataMap.ventes)].filter((row) => getRemaining(row) > 0).map((row) => ({ name: row.client_label || row.client || row.client_id || 'Client', amount: getRemaining(row) }));
  return [...clients, ...orders].slice(0, 6);
}

function globalSearch(dataMap = {}, message = '') {
  const words = norm(message).split(/\s+/).filter((word) => word.length > 3).slice(0, 7);
  if (!words.length) return [];
  const results = [];
  Object.entries(dataMap || {}).forEach(([moduleKey, rows]) => {
    arr(rows).slice(0, 80).forEach((row) => {
      const haystack = norm(Object.values(row || {}).slice(0, 18).join(' '));
      const score = words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0);
      if (score) results.push({ moduleKey, row, score });
    });
  });
  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

export async function runHorizonAgent({ message, dataMap = {}, actions = {}, pendingAction = null }) {
  const lang = detectLanguage(message);
  const intent = detectIntent(message);
  const clean = norm(message);

  if (intent === 'cancel_action') return { intent, language: lang, text: t(lang, 'cancelled'), pendingAction: null, quickReplies: quick(lang) };

  if (intent === 'confirm_action' && pendingAction) {
    const result = await executePendingAction(pendingAction, actions, lang);
    return { ...result, language: lang, pendingAction: null };
  }

  if (intent === 'log_egg_collection') {
    const quantity = parseNumber(message);
    const tablets = Math.floor(quantity / 30);
    return { intent, language: lang, text: `${t(lang, 'eggPrepared', { qty: fmtNumber(quantity) })} ${t(lang, 'confirmAsk')}`, dataCard: card(lang === 'en' ? 'Egg collection to confirm' : lang === 'wo' ? 'Ponte bu ñuy dëggal' : 'Ramassage à confirmer', [{ label: 'Œufs', value: `${fmtNumber(quantity)}` }, { label: 'Tablettes', value: `${fmtNumber(tablets)}` }, { label: 'Date', value: new Date().toLocaleDateString('fr-FR') }]), quickReplies: quick(lang, lang === 'en' ? 'Confirm' : lang === 'wo' ? 'Dëggal' : 'Confirmer', lang === 'en' ? 'Cancel' : lang === 'wo' ? 'Bayi' : 'Annuler'), pendingAction: { type: 'log_egg_collection', quantity, tablets } };
  }

  if (intent === 'log_sale') {
    const quantity = parseNumber(message, 1);
    const amountMatch = clean.match(/paye\s+(\d+[\s\d]*)|payé\s+(\d+[\s\d]*)|paid\s+(\d+[\s\d]*)|fcfa\s*(\d+[\s\d]*)/);
    const amount = amountMatch ? Number((amountMatch[1] || amountMatch[2] || amountMatch[3] || amountMatch[4] || '0').replace(/\s/g, '')) : 0;
    const clientMatch = message.match(/(?:a|à|for|pour)\s+([^,]+?)(?:,| payé| paye| paid| fcfa|$)/i);
    const client = textOf(clientMatch?.[1]) || (lang === 'en' ? 'walk-in customer' : 'Client comptoir');
    return { intent, language: lang, text: `${t(lang, 'salePrepared', { qty: fmtNumber(quantity), client })} ${t(lang, 'confirmAsk')}`, dataCard: card(lang === 'en' ? 'Sale to confirm' : lang === 'wo' ? 'Vente bu ñuy dëggal' : 'Vente à confirmer', [{ label: 'Client', value: client }, { label: 'Quantité', value: `${fmtNumber(quantity)} tablette(s)` }, { label: 'Paiement', value: amount ? fmtMoney(amount) : 'Non précisé' }]), quickReplies: quick(lang, lang === 'en' ? 'Confirm' : lang === 'wo' ? 'Dëggal' : 'Confirmer', lang === 'en' ? 'Cancel' : lang === 'wo' ? 'Bayi' : 'Annuler'), pendingAction: { type: 'log_sale', quantity, amount, client } };
  }

  if (intent === 'query_sensors') {
    const alerts = sensorAlerts(dataMap);
    if (!alerts.length) return { intent: 'sensor_alert', language: lang, text: t(lang, 'sensorOk'), dataCard: card('Capteurs & caméras', [{ label: 'Statut', value: 'OK' }]), quickReplies: quick(lang, 'Stock aliment', 'Ponte du jour') };
    const first = alerts[0];
    return { intent: first.type, language: lang, text: lang === 'en' ? `I found ${alerts.length} field alert(s). The first one is: ${first.text}.` : lang === 'wo' ? `Gis naa ${alerts.length} alerte terrain. Bu njëkk bi mooy: ${first.text}.` : `J’ai trouvé ${alerts.length} alerte(s) terrain. La première : ${first.text}.`, dataCard: card('Alertes terrain', alerts.slice(0, 4).map((a) => ({ label: a.title, value: a.text }))), quickReplies: quick(lang, 'Créer une tâche', 'Voir capteurs', 'Voir caméras') };
  }

  if (intent === 'query_stock') {
    const stock = findStock(dataMap, clean.includes('aliment') || clean.includes('feed') ? 'aliment' : '');
    if (!stock) return { intent, language: lang, text: t(lang, 'noStock'), quickReplies: quick(lang) };
    const low = Number(stock.seuil || 0) > 0 && Number(stock.quantite || 0) <= Number(stock.seuil || 0);
    return { intent, language: lang, text: lang === 'en' ? `There are ${fmtNumber(stock.quantite)} ${stock.unite || ''} of ${stock.produit || stock.name || stock.nom || 'stock'} left.` : lang === 'wo' ? `${stock.produit || stock.name || stock.nom || 'Stock'} des na ${fmtNumber(stock.quantite)} ${stock.unite || ''}.` : `Il reste ${fmtNumber(stock.quantite)} ${stock.unite || ''} de ${stock.produit || stock.name || stock.nom || 'stock'}.`, dataCard: card(low ? 'Stock à surveiller' : 'Stock disponible', [{ label: 'Produit', value: stock.produit || stock.name || stock.nom || 'Produit' }, { label: 'Quantité', value: `${fmtNumber(stock.quantite)} ${stock.unite || ''}` }, { label: 'Seuil', value: stock.seuil ? `${fmtNumber(stock.seuil)} ${stock.unite || ''}` : 'Non défini' }]), quickReplies: quick(lang, 'Commander sacs', 'Alertes capteurs') };
  }

  if (intent === 'query_egg') {
    const egg = latestEgg(dataMap);
    if (!egg) return { intent, language: lang, text: t(lang, 'noEgg'), quickReplies: quick(lang, 'Ramassé 120 œufs', 'Stock aliment') };
    const qty = egg.quantity || egg.quantite || egg.nombre_oeufs || egg.oeufs_produits || egg.eggs_count || 0;
    return { intent, language: lang, text: lang === 'en' ? `Latest egg collection: ${fmtNumber(qty)} eggs.` : lang === 'wo' ? `Ponte bu mujj: ${fmtNumber(qty)} nen.` : `Dernière ponte enregistrée : ${fmtNumber(qty)} œufs.`, dataCard: card('Ponte récente', [{ label: 'Œufs', value: `${fmtNumber(qty)}` }, { label: 'Date', value: new Date(egg.date || egg.created_at || Date.now()).toLocaleDateString('fr-FR') }]), quickReplies: quick(lang, 'Créer une vente', 'Stock aliment') };
  }

  if (intent === 'query_credits') {
    const rows = creditRows(dataMap);
    if (!rows.length) return { intent, language: lang, text: t(lang, 'noCredits'), quickReplies: quick(lang) };
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    return { intent, language: lang, text: lang === 'en' ? `${rows.length} customer(s) still owe ${fmtMoney(total)}.` : lang === 'wo' ? `${rows.length} client am nañu bor: ${fmtMoney(total)}.` : `${rows.length} client(s) ont encore ${fmtMoney(total)} à régler.`, dataCard: card('Créances clients', rows.map((row) => ({ label: row.name, value: fmtMoney(row.amount) }))), quickReplies: quick(lang, 'Relancer clients', 'Voir ventes') };
  }

  if (intent === 'query_sales') {
    const stats = buildStats(dataMap);
    return { intent, language: lang, text: lang === 'en' ? `Current cash collected: ${fmtMoney(stats.caisse)}. Customer debt: ${fmtMoney(stats.creances)}.` : lang === 'wo' ? `Caisse bi: ${fmtMoney(stats.caisse)}. Bor clients yi: ${fmtMoney(stats.creances)}.` : `Caisse suivie : ${fmtMoney(stats.caisse)}. Créances clients : ${fmtMoney(stats.creances)}.`, dataCard: card('Ventes & caisse', [{ label: 'Caisse', value: fmtMoney(stats.caisse) }, { label: 'Créances', value: fmtMoney(stats.creances) }]), quickReplies: quick(lang, 'Qui doit payer ?', 'Créer une vente') };
  }

  if (intent === 'query_alerts') {
    const alerts = [...arr(dataMap.alertes_center), ...arr(dataMap.alertes)].filter((row) => !['resolue', 'résolue', 'termine', 'terminé'].includes(norm(row.status || row.statut)));
    return { intent, language: lang, text: alerts.length ? `${alerts.length} alerte(s) ouverte(s).` : 'Aucune alerte ouverte importante.', dataCard: card('Alertes ouvertes', alerts.slice(0, 5).map((row) => ({ label: row.title || row.type || 'Alerte', value: row.message || row.description || row.severity || 'À vérifier' }))), quickReplies: quick(lang, 'Alertes capteurs', 'Créer tâche') };
  }

  if (intent === 'query_tasks') {
    const tasks = arr(dataMap.taches).filter((row) => !['termine', 'terminé', 'done', 'fait'].includes(norm(row.status || row.statut)));
    return { intent, language: lang, text: tasks.length ? `${tasks.length} tâche(s) restent ouvertes.` : 'Aucune tâche urgente visible.', dataCard: card('Tâches ouvertes', tasks.slice(0, 5).map((row) => ({ label: row.title || row.nom || 'Tâche', value: row.status || row.statut || 'À faire' }))), quickReplies: quick(lang, 'Alertes', 'Stock') };
  }

  if (intent === 'query_documents') {
    const docs = arr(dataMap.documents).slice(0, 5);
    return { intent, language: lang, text: docs.length ? `Je vois ${arr(dataMap.documents).length} document(s).` : 'Je ne vois pas encore de document enregistré.', dataCard: card('Documents récents', docs.map((row) => ({ label: row.title || row.nom || 'Document', value: row.document_category || row.type || row.created_at || 'Document' }))), quickReplies: quick(lang, 'Factures', 'Preuves vente') };
  }

  if (intent === 'mark_health_done') {
    return { intent, language: lang, text: lang === 'en' ? 'I can mark this health action as done after confirmation.' : lang === 'wo' ? 'Man naa def soin bi ni mu jeex gannaaw dëggal.' : 'Je peux marquer ce soin comme réalisé après confirmation.', dataCard: card('Soin à confirmer', [{ label: 'Action', value: 'Marquer comme fait' }, { label: 'Suite', value: 'Mettre à jour Santé' }]), quickReplies: quick(lang, lang === 'en' ? 'Confirm' : lang === 'wo' ? 'Dëggal' : 'Confirmer', lang === 'en' ? 'Cancel' : lang === 'wo' ? 'Bayi' : 'Annuler'), pendingAction: { type: 'mark_health_done', message } };
  }

  if (intent === 'create_order') {
    const quantity = parseNumber(message, 1);
    return { intent, language: lang, text: `${t(lang, 'orderPrepared', { qty: fmtNumber(quantity) })} ${t(lang, 'confirmAsk')}`, dataCard: card('Commande à confirmer', [{ label: 'Quantité', value: `${fmtNumber(quantity)} sac(s)` }, { label: 'Statut', value: 'Brouillon' }]), quickReplies: quick(lang, lang === 'en' ? 'Confirm' : lang === 'wo' ? 'Dëggal' : 'Confirmer', lang === 'en' ? 'Cancel' : lang === 'wo' ? 'Bayi' : 'Annuler'), pendingAction: { type: 'create_order', quantity, message } };
  }

  const found = globalSearch(dataMap, message);
  if (found.length) return { intent: 'global_search', language: lang, text: lang === 'en' ? `I found ${found.length} possible result(s) in the farm data.` : lang === 'wo' ? `Gis naa ${found.length} résultat ci données ferme bi.` : `J’ai trouvé ${found.length} résultat(s) possible(s) dans les données de la ferme.`, dataCard: card('Résultats trouvés', found.map(({ moduleKey, row }) => ({ label: MODULE_LABELS[moduleKey] || moduleKey, value: row.title || row.nom || row.name || row.client || row.produit || row.id || 'Élément' }))), quickReplies: quick(lang, 'Résumé ferme', 'Alertes capteurs') };

  return { intent: 'fallback', language: lang, text: t(lang, 'fallback'), quickReplies: quick(lang) };
}

async function executePendingAction(pendingAction, actions = {}, lang = 'fr') {
  if (pendingAction.type === 'log_egg_collection') {
    const rowId = id('PONTE');
    await actions.production?.create?.({ id: rowId, quantity: pendingAction.quantity, quantite: pendingAction.quantity, nombre_oeufs: pendingAction.quantity, oeufs_produits: pendingAction.quantity, tablettes: pendingAction.tablets, date: nowIso(), source: 'Horizon Chat' });
    await actions.events?.create?.({ id: id('EVT'), event_type: 'production_oeufs', module_source: 'avicole', entity_type: 'production_oeufs', entity_id: rowId, title: 'Ramassage œufs enregistré', description: `${fmtNumber(pendingAction.quantity)} œufs`, event_date: nowIso(), severity: 'info' });
    await actions.production?.refresh?.();
    await actions.events?.refresh?.();
    return { intent: pendingAction.type, text: lang === 'en' ? 'Saved. Egg production has been updated.' : lang === 'wo' ? 'Bind nañu ko. Ponte bi yeesal na.' : 'C’est enregistré. La ponte est mise à jour.', dataCard: card('Ramassage enregistré', [{ label: 'Œufs', value: fmtNumber(pendingAction.quantity) }, { label: 'Tablettes', value: fmtNumber(pendingAction.tablets) }]), quickReplies: quick(lang) };
  }

  if (pendingAction.type === 'log_sale') {
    const saleId = id('CMD');
    await actions.sales?.create?.({ id: saleId, client_label: pendingAction.client, client: pendingAction.client, product_name: 'Tablettes œufs', quantity: pendingAction.quantity, unit: 'tablette', montant_total: pendingAction.amount, montant_paye: pendingAction.amount, reste_a_payer: pendingAction.amount ? 0 : null, statut_paiement: pendingAction.amount ? 'paye' : 'non_paye', statut_commande: 'confirme', created_at: nowIso(), source: 'Horizon Chat' });
    if (pendingAction.amount) await actions.payments?.create?.({ id: id('PAY'), order_id: saleId, sale_id: saleId, montant: pendingAction.amount, amount: pendingAction.amount, client: pendingAction.client, statut: 'paye', created_at: nowIso(), source: 'Horizon Chat' });
    await actions.events?.create?.({ id: id('EVT'), event_type: 'vente', module_source: 'ventes', entity_type: 'vente', entity_id: saleId, title: 'Vente enregistrée via Horizon Chat', description: `${pendingAction.quantity} tablette(s) - ${pendingAction.client}`, amount: pendingAction.amount || null, event_date: nowIso(), severity: 'info' });
    await actions.sales?.refresh?.();
    await actions.payments?.refresh?.();
    await actions.events?.refresh?.();
    return { intent: pendingAction.type, text: lang === 'en' ? 'Sale saved. You can review it in Sales.' : lang === 'wo' ? 'Vente bi bind nañu ko. Mën nga ko seet ci Ventes.' : 'Vente enregistrée. Tu peux la vérifier dans Ventes.', dataCard: card('Vente enregistrée', [{ label: 'Client', value: pendingAction.client }, { label: 'Quantité', value: `${fmtNumber(pendingAction.quantity)} tablette(s)` }, { label: 'Paiement', value: pendingAction.amount ? fmtMoney(pendingAction.amount) : 'À encaisser' }]), quickReplies: quick(lang) };
  }

  if (pendingAction.type === 'create_order') {
    await actions.suppliers?.create?.({ id: id('CMD-FOUR'), nom: 'Commande Horizon Chat', quantite: pendingAction.quantity, statut: 'brouillon', created_at: nowIso(), source: 'Horizon Chat' });
    await actions.suppliers?.refresh?.();
    return { intent: pendingAction.type, text: lang === 'en' ? 'Draft order prepared.' : lang === 'wo' ? 'Commande brouillon pare na.' : 'Commande préparée en brouillon.', dataCard: card('Commande préparée', [{ label: 'Quantité', value: `${fmtNumber(pendingAction.quantity)} sac(s)` }, { label: 'Statut', value: 'Brouillon' }]), quickReplies: quick(lang) };
  }

  if (pendingAction.type === 'mark_health_done') {
    await actions.events?.create?.({ id: id('EVT'), event_type: 'soin', module_source: 'sante', entity_type: 'sante', entity_id: id('SOIN'), title: 'Soin confirmé via Horizon Chat', description: pendingAction.message || 'Soin marqué comme fait', event_date: nowIso(), severity: 'info' });
    await actions.events?.refresh?.();
    return { intent: pendingAction.type, text: lang === 'en' ? 'Health action confirmed. Please review the exact record in Health if needed.' : lang === 'wo' ? 'Soin bi dëggal nañu ko. Mën nga ko seet ci Santé.' : 'Soin confirmé. Vérifie la fiche exacte dans Santé si nécessaire.', quickReplies: quick(lang) };
  }

  return { intent: 'fallback', text: t(lang, 'fallback'), quickReplies: quick(lang) };
}

export function getHorizonChatStats(dataMap = {}) {
  return buildStats(dataMap);
}

export function getHorizonSensorAlerts(dataMap = {}) {
  return sensorAlerts(dataMap);
}
