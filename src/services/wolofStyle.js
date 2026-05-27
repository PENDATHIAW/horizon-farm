const WOLOF_PATTERNS = [
  'naka', 'ndax', 'dafa', 'am na', 'des na', 'xaalis', 'bor', 'waaw', 'deedeet', 'déedéet', 'jamm', 'kan', 'ku ', 'moo', 'looy', 'lan', 'ana', 'doy', 'benn', 'ñaar', 'nen', 'liggéey', 'toppatoo', 'feebar', 'faj', 'ganaar', 'nen yi', 'bi ', ' yi'
];

export function normalizeWolofText(text = '') {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function isLikelyWolof(text = '') {
  const clean = normalizeWolofText(text);
  return WOLOF_PATTERNS.some((item) => clean.includes(normalizeWolofText(item)));
}

export function wolofIntentHints(text = '') {
  const clean = normalizeWolofText(text);
  return {
    health: /(febar|feebar|malad|faj|soin|toppatoo|vaccin|deey|dee|mortalite|mortalité)/.test(clean),
    money: /(xaalis|bor|war|fey|pay|paye|paie|dette|creance|créance)/.test(clean),
    stock: /(stock|aliment|des|doy|sac|reste|am na)/.test(clean),
    egg: /(nen|oeuf|œuf|ponte|ramass|tablette)/.test(clean),
    sensor: /(capteur|camera|caméra|tang|temperature|température|humid|raki|mouvement)/.test(clean),
    task: /(liggeey|liggéey|tache|tâche|defar|controle|contrôle)/.test(clean),
  };
}

export function wolofFallbackByIntent(intent, data = {}) {
  const stats = data.stats || {};
  const hints = data.hints || {};
  if (hints.health || intent === 'query_health') {
    return 'Maa ngi seet ci Santé. Su fekkee am na cas bu ñu bind, dinaa la ko won. Boo bëggee, laajal ma “kan moo feebar?” walla “soin yi naka lañu deme?”.';
  }
  if (hints.money || intent === 'query_credits') {
    if (Number(stats.creances || 0) > 0) return `Waaw, am na bor bu des. Total bi tollu na ci ${Number(stats.creances).toLocaleString('fr-FR')} FCFA. Ndax nga bëgg ma won la clients yi?`;
    return 'Léegi gisuma bor bu am solo. Soo bëggee, man naa seet ventes yi ak paiements yi benn-benn.';
  }
  if (hints.stock || intent === 'query_stock') {
    return 'Maa ngi seet stock bi. Waxal ma produit bi nga bëgg, par exemple “stock aliment bi naka la?”.';
  }
  if (hints.egg || intent === 'query_egg') {
    if (Number(stats.latestPonte || 0) > 0) return `Ponte bu mujj bi mooy ${Number(stats.latestPonte).toLocaleString('fr-FR')} nen. Ndax ma seet stock tablettes walla vente yi?`;
    return 'Gisuma ponte bu bees léegi. Soo ramassee tey, wax ma nombre bi, ma waajal ko.';
  }
  if (hints.sensor || intent === 'query_sensors') {
    return 'Maa ngi seet capteurs ak caméras yi. Su am température, humidité walla mouvement bu metti, dinaa la ko wax te ma la proposal action.';
  }
  return 'Waaw Penda, maa ngi la dégg. Laajal ma ci stock, ponte, ventes, bor clients, santé, capteurs walla caméras, dinaa seet ci données ferme bi.';
}

export function softenWolofAnswer(text = '') {
  let value = String(text || '').trim();
  if (!value) return value;
  value = value
    .replace(/Man naa laa dimbali/gi, 'Maa ngi la dimbali')
    .replace(/Gis naa ay clients yu am bor/gi, 'Am na clients yu la war xaalis')
    .replace(/Gisuma/gi, 'Léegi gisuma')
    .replace(/Ndax nga dëggal\?/gi, 'Ndax nga confirm ko?')
    .replace(/Dinaa ko bind su fekkee nga dëggal/gi, 'Dinaa ko enregistrer boo confirmée')
    .replace(/données/gi, 'données')
    .replace(/module/gi, 'espace');
  if (!/^(waaw|déedéet|deedeet|maa ngi|léegi|baax na|jamm)/i.test(value)) {
    value = `Waaw, ${value.charAt(0).toLowerCase()}${value.slice(1)}`;
  }
  return value;
}

export function wolofTtsPrep(text = '') {
  return String(text || '')
    .replace(/FCFA/g, 'franc CFA')
    .replace(/ERP/g, 'Horizon Farm')
    .replace(/œufs/g, 'nen')
    .replace(/oeufs/g, 'nen')
    .replace(/Créances/g, 'Bor clients')
    .replace(/créances/g, 'bor clients')
    .trim();
}
