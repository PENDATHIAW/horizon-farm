import { test } from '@playwright/test';

const BASE = 'http://localhost:5173';
const CREDS = { login: 'penda', password: 'Mariemediatta10#' };

// ── login helper ─────────────────────────────────────────────────────────────
async function doLogin(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  const loginInput = page.locator('input[placeholder*="penda"], input[type="text"]').first();
  const passInput = page.locator('input[type="password"]').first();

  if (!(await loginInput.isVisible().catch(() => false))) return false;

  await loginInput.fill(CREDS.login);
  await passInput.fill(CREDS.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(4000); // attendre chargement Supabase
  return true;
}

// ── naviguer vers un module ───────────────────────────────────────────────────
async function goToModule(page, patterns) {
  for (const pattern of patterns) {
    const btn = page.locator('button, a').filter({ hasText: pattern }).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(1500);
      return true;
    }
  }
  return false;
}

// ── cliquer "Ajouter" et retourner si modal ouverte ───────────────────────────
async function clickAddAndCheckModal(page) {
  const addBtn = page.locator('button').filter({ hasText: /ajouter|nouveau|create|\+/i }).first();
  if (!(await addBtn.isVisible({ timeout: 2000 }).catch(() => false))) return { found: false };
  await addBtn.click();
  await page.waitForTimeout(800);
  const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
  const open = await modal.isVisible({ timeout: 2000 }).catch(() => false);
  return { found: true, modal: open, element: modal };
}

// ── capturer erreurs console ──────────────────────────────────────────────────
function listenConsole(page) {
  const errs = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errs.push(msg.text()); });
  page.on('pageerror', (err) => errs.push(err.message));
  return errs;
}

function listenNetwork(page) {
  const networkErrors = [];
  page.on('response', async (resp) => {
    if (resp.url().includes('supabase.co') && resp.status() >= 400) {
      const body = await resp.text().catch(() => '');
      networkErrors.push(`HTTP ${resp.status()}: ${resp.url().split('?')[0].split('/rest/')[1] || resp.url().split('?')[0]} — ${body.slice(0, 120)}`);
    }
  });
  return networkErrors;
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 0 : Chargement initial + login
// ═════════════════════════════════════════════════════════════════════════════
test('00. Chargement et authentification', async ({ page }) => {
  const consoleErrors = listenConsole(page);
  const networkErrors = listenNetwork(page);

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/00_login.png' });

  const hasLoginForm = await page.locator('input[type="password"]').isVisible().catch(() => false);
  console.log(hasLoginForm ? '[OK] Login form visible' : '[INFO] Pas de login form (session active?)');

  if (hasLoginForm) {
    const ok = await doLogin(page);
    await page.screenshot({ path: 'tests/screenshots/00b_after_login.png' });
    if (ok) console.log('[OK] Login soumis');
  }

  await page.waitForTimeout(3000);
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const loggedIn = /dashboard|animaux|finances|troupeau|horizon farm erp/i.test(bodyText);
  console.log(loggedIn ? '[OK] App chargée après login' : '[WARN] App non chargée après login');

  if (consoleErrors.length > 0) consoleErrors.slice(0, 5).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 200)}`));
  else console.log('[OK] Aucune erreur console');

  if (networkErrors.length > 0) networkErrors.slice(0, 5).forEach((e) => console.log(`[ERROR réseau] ${e}`));
  else console.log('[OK] Aucune erreur réseau');
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 1 : Dashboard
// ═════════════════════════════════════════════════════════════════════════════
test('01. Dashboard — KPIs, météo, alertes', async ({ page }) => {
  const consoleErrors = listenConsole(page);
  const networkErrors = listenNetwork(page);

  await doLogin(page);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/screenshots/01_dashboard.png', fullPage: false });

  const bodyText = await page.locator('body').innerText().catch(() => '');

  const checks = [
    { re: /animaux|troupeau/i, label: 'KPI Animaux' },
    { re: /avicole|lots|poulets/i, label: 'KPI Avicole' },
    { re: /fcfa|finances|trésorerie|recette/i, label: 'KPI Finances' },
    { re: /°c|temperature|météo|meteo/i, label: 'Météo' },
    { re: /alerte/i, label: 'Alertes' },
    { re: /opportunit/i, label: 'Opportunités commerciales' },
    { re: /stock|seuil/i, label: 'Stocks' },
    { re: /business plan|bp|investissement/i, label: 'Business Plans' },
  ];
  for (const { re, label } of checks) {
    console.log(re.test(bodyText) ? `[OK] ${label} visible` : `[WARN] ${label} absent du dashboard`);
  }

  // Champs techniques qui ne devraient PAS apparaître
  const techBad = [/owner_user_id/i, /\[object Object\]/i, /undefined/i, /NaN(?!px)/g];
  for (const re of techBad) {
    if (re.test(bodyText)) console.log(`[ERROR] Champ technique brut visible: ${re}`);
  }

  if (consoleErrors.length > 0) consoleErrors.slice(0, 5).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
  if (networkErrors.length > 0) networkErrors.forEach((e) => console.log(`[ERROR réseau] ${e}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 2 : Animaux
// ═════════════════════════════════════════════════════════════════════════════
test('02. Animaux — liste, formulaire, fiche', async ({ page }) => {
  const consoleErrors = listenConsole(page);
  const networkErrors = listenNetwork(page);

  await doLogin(page);
  const found = await goToModule(page, [/animaux/i, /troupeau/i]);

  if (!found) { console.log('[SKIP] Module Animaux non trouvé'); return; }
  await page.screenshot({ path: 'tests/screenshots/02_animaux.png' });

  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log(`[INFO] ${(bodyText.match(/BOV|OV|CAP/g) || []).length} références animaux visibles`);

  // Vérifier la liste
  const animalRows = await page.locator('table tr, [class*="card"], [class*="row"]').count();
  console.log(`[INFO] ${animalRows} lignes/cards animaux dans la vue`);

  // Ouvrir formulaire Ajouter
  const { found: btnFound, modal, element } = await clickAddAndCheckModal(page);
  if (!btnFound) { console.log('[WARN] Bouton Ajouter non trouvé dans Animaux'); }
  else if (!modal) { console.log('[ERROR] Bouton Ajouter cliqué mais modal non ouverte'); }
  else {
    console.log('[OK] Modal Ajouter animal ouverte');
    await page.screenshot({ path: 'tests/screenshots/02b_animaux_form.png' });

    const formText = await element.innerText().catch(() => '');

    // Vérifier champs date
    const dateInputs = await element.locator('input[type="date"]').all();
    console.log(`[INFO] ${dateInputs.length} champs date dans formulaire animal`);
    for (const di of dateInputs) {
      const val = await di.inputValue();
      const placeholder = await di.getAttribute('placeholder') || 'champ date';
      if (val === '') console.log(`[WARN] Champ date vide: ${placeholder} — risque erreur Supabase`);
      else console.log(`[OK] Champ date pré-rempli: ${placeholder} = ${val}`);
    }

    // Vérifier mode_acquisition présent
    if (/mode.acquisition|achat|naissance/i.test(formText)) console.log('[OK] Champ mode_acquisition présent');
    else console.log('[WARN] Champ mode_acquisition absent du formulaire');

    // Vérifier champs techniques absents
    if (/owner_user_id|created_at/i.test(formText)) console.log('[ERROR] Champs techniques visibles dans formulaire');

    // Tenter sauvegarde à vide pour voir la validation
    const saveBtn = element.locator('button[type="submit"], button').filter({ hasText: /enregistrer|sauv|créer/i }).first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
      const toasts = await page.locator('[class*="toast"], [class*="alert"]').allInnerTexts();
      if (toasts.length > 0) console.log(`[INFO] Toast après submit vide: ${toasts.join(' | ').slice(0, 100)}`);
    }

    // Fermer modal
    const closeBtn = element.locator('button').filter({ hasText: /annuler|fermer|×|✕/i }).first();
    await closeBtn.click({ timeout: 2000 }).catch(() => page.keyboard.press('Escape'));
    await page.waitForTimeout(500);
  }

  // Tester fiche Voir (clic sur premier animal si disponible)
  const eyeBtn = page.locator('button[title*="voir"], button[title*="fiche"], button[aria-label*="voir"]').first();
  if (await eyeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await eyeBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/02c_animaux_detail.png' });
    const detailText = await page.locator('body').innerText().catch(() => '');
    if (/owner_user_id/i.test(detailText)) console.log('[ERROR] owner_user_id affiché dans fiche animal');
    else console.log('[OK] Pas de champs techniques bruts dans fiche animal');
    if (/prix|coût|frais|marge/i.test(detailText)) console.log('[OK] Coûts visibles dans fiche interne animal');
    else console.log('[WARN] Coûts non visibles dans fiche interne animal');
    await page.keyboard.press('Escape');
  }

  if (networkErrors.length > 0) networkErrors.forEach((e) => console.log(`[ERROR réseau] ${e}`));
  if (consoleErrors.length > 0) consoleErrors.slice(0, 3).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 3 : Avicole / Lots
// ═════════════════════════════════════════════════════════════════════════════
test('03. Avicole — lots, date début, phases, production', async ({ page }) => {
  const consoleErrors = listenConsole(page);
  const networkErrors = listenNetwork(page);

  await doLogin(page);
  const found = await goToModule(page, [/avicole/i, /lots/i, /poulets/i]);
  if (!found) { console.log('[SKIP] Module Avicole non trouvé'); return; }
  await page.screenshot({ path: 'tests/screenshots/03_avicole.png' });

  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log(`[INFO] Lots trouvés: ${(bodyText.match(/LOTPO|LOTCH|lot/gi) || []).length}`);

  // Vérifier présence sections clés
  if (/pondeuse|chair/i.test(bodyText)) console.log('[OK] Types de lots visibles (pondeuse/chair)');
  else console.log('[WARN] Types de lots non clairement visibles');

  if (/phase|demarrage|croissance|finition/i.test(bodyText)) console.log('[OK] Phase lot visible');
  else console.log('[WARN] Phase lot non visible');

  if (/age.*lot|jours/i.test(bodyText)) console.log('[OK] Âge lot visible');
  else console.log('[WARN] Âge lot non visible');

  // Formulaire Ajouter
  const { found: btnFound, modal: modalOpen, element } = await clickAddAndCheckModal(page);
  if (btnFound && modalOpen) {
    console.log('[OK] Modal Ajouter lot ouverte');
    await page.screenshot({ path: 'tests/screenshots/03b_lot_form.png' });
    const formText = await element.innerText().catch(() => '');

    // Date début obligatoire
    if (/date.d.but|date début/i.test(formText)) console.log('[OK] Champ "date début" présent dans formulaire lot');
    else console.log('[WARN] Champ "date début" absent — lot ne peut pas être créé proprement');

    // Oeufs cassés ne devrait PAS être dans le formulaire lot
    if (/oeufs.cass/i.test(formText)) console.log('[WARN] Champ "œufs cassés" dans formulaire lot — devrait être dans Production');
    else console.log('[OK] "Œufs cassés" absent du formulaire lot (correct)');

    // Production/jour ne devrait PAS être dans le formulaire lot
    if (/production.*jour/i.test(formText)) console.log('[WARN] "Production/jour" dans formulaire lot — devrait être dans journal production');
    else console.log('[OK] "Production/jour" absent du formulaire lot (correct)');

    // IC (indice de consommation) — pertinent pour chair seulement
    if (/\bic\b|indice.*consomm/i.test(formText)) console.log('[INFO] IC présent dans formulaire lot');

    const dateInputs = await element.locator('input[type="date"]').all();
    console.log(`[INFO] ${dateInputs.length} champs date dans formulaire lot`);
    for (const di of dateInputs) {
      const val = await di.inputValue();
      if (val === '') console.log('[WARN] Champ date vide dans formulaire lot — ne pas envoyer à Supabase');
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } else {
    console.log('[WARN] Modal Ajouter lot non trouvée');
  }

  // Attendre la fermeture complète de toute modale avant de cliquer les onglets
  await page.keyboard.press('Escape');
  await page.waitForSelector('.fixed.inset-0', { state: 'detached', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  const productionTab = page.locator('button, [role="tab"]').filter({ hasText: /production|oeufs|journal/i }).first();
  const modalGone = !(await page.locator('.fixed.inset-0').isVisible().catch(() => false));
  if (modalGone && await productionTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await productionTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/03c_production_oeufs.png' });
    console.log('[OK] Onglet Production/Œufs accessible');
  } else {
    console.log('[INFO] Onglet Production Œufs non visible ou modale encore ouverte');
  }

  if (networkErrors.length > 0) networkErrors.forEach((e) => console.log(`[ERROR réseau] ${e}`));
  if (consoleErrors.length > 0) consoleErrors.slice(0, 3).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 4 : Business Plans
// ═════════════════════════════════════════════════════════════════════════════
test('04. Business Plans — wizard, durées, embouche 3 mois', async ({ page }) => {
  const consoleErrors = listenConsole(page);
  const networkErrors = listenNetwork(page);

  await doLogin(page);
  const found = await goToModule(page, [/investissement/i, /business/i, /plan/i]);
  if (!found) { console.log('[SKIP] Module Investissements non trouvé'); return; }
  await page.screenshot({ path: 'tests/screenshots/04_bp.png' });

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (/business plan|plan d.affaire/i.test(bodyText)) console.log('[OK] Section Business Plans visible');

  // Tester le wizard
  const wizardBtn = page.locator('button').filter({ hasText: /wizard|nouveau.plan|créer.*plan/i }).first();
  if (await wizardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await wizardBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/04b_wizard_step1.png' });

    const wizardText = await page.locator('body').innerText().catch(() => '');

    // Étape 1 : sélection activité
    if (/bovin.*embouche|ovin.*embouche|caprin/i.test(wizardText)) {
      console.log('[OK] Types embouche visibles dans wizard (étape activité)');

      // Cliquer sur "Bovins embouche" si disponible
      const bovinBtn = page.locator('button, [class*="card"], div').filter({ hasText: /bovin.*embouche/i }).first();
      if (await bovinBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bovinBtn.click();
        await page.waitForTimeout(500);
        console.log('[OK] Sélection Bovins embouche');
      }
    } else {
      console.log('[INFO] Étape activité: pas encore visible ou liste différente');
    }

    // Avancer dans le wizard (bouton Suivant)
    const nextBtn = page.locator('button').filter({ hasText: /suivant|next|>>/i }).first();
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'tests/screenshots/04c_wizard_step2.png' });

      const step2Text = await page.locator('body').innerText().catch(() => '');
      // Chercher la durée par défaut affichée
      if (/3 mois/i.test(step2Text)) console.log('[OK] Durée 3 mois par défaut affichée dans wizard embouche');
      else if (/6 mois/i.test(step2Text)) console.log('[WARN] Durée 6 mois encore affichée — correction bpTemplates pas prise en compte?');
      else if (/5 mois/i.test(step2Text)) console.log('[WARN] Durée 5 mois encore affichée');
      else if (/4 mois/i.test(step2Text)) console.log('[WARN] Durée 4 mois encore affichée');
      else {
        // Chercher le champ durée
        const durationInput = page.locator('input[name*="duree"], input[placeholder*="mois"]').first();
        const durationVal = await durationInput.inputValue().catch(() => '');
        if (durationVal) console.log(`[INFO] Durée cycle = "${durationVal}" mois dans wizard`);
        else console.log('[INFO] Durée cycle non trouvée dans step 2');
      }
    }

    // Fermer wizard
    const closeBtn = page.locator('button').filter({ hasText: /fermer|annuler|×/i }).first();
    await closeBtn.click({ timeout: 2000 }).catch(() => page.keyboard.press('Escape'));
  } else {
    console.log('[INFO] Bouton wizard non trouvé — chercher autre bouton création BP');
    const { found: btnFound, modal: modalOpen } = await clickAddAndCheckModal(page);
    if (btnFound && modalOpen) {
      console.log('[OK] Modal création BP ouverte');
      await page.screenshot({ path: 'tests/screenshots/04b_bp_modal.png' });
      await page.keyboard.press('Escape');
    }
  }

  // Vérifier BP existants affichés
  const bpCards = await page.locator('[class*="card"], [class*="plan"], table tr').count();
  console.log(`[INFO] ${bpCards} éléments BP visibles dans la liste`);

  if (networkErrors.length > 0) networkErrors.forEach((e) => console.log(`[ERROR réseau] ${e}`));
  if (consoleErrors.length > 0) consoleErrors.slice(0, 3).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 5 : Ventes
// ═════════════════════════════════════════════════════════════════════════════
test('05. Ventes — onglets, opportunités, commandes', async ({ page }) => {
  const consoleErrors = listenConsole(page);
  const networkErrors = listenNetwork(page);

  await doLogin(page);
  const found = await goToModule(page, [/ventes/i, /commandes/i]);
  if (!found) { console.log('[SKIP] Module Ventes non trouvé'); return; }
  await page.screenshot({ path: 'tests/screenshots/05_ventes.png' });

  const bodyText = await page.locator('body').innerText().catch(() => '');

  const tabs = ['Opportunités', 'Commandes', 'Factures', 'Livraisons', 'Paiements'];
  for (const tab of tabs) {
    if (new RegExp(tab, 'i').test(bodyText)) console.log(`[OK] Onglet "${tab}" présent`);
    else console.log(`[WARN] Onglet "${tab}" absent`);
  }

  // Onglet Opportunités
  const oppTab = page.locator('button, [role="tab"]').filter({ hasText: /opportunit/i }).first();
  if (await oppTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await oppTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/05b_opportunites.png' });
    const oppText = await page.locator('body').innerText().catch(() => '');
    if (/prêt.*vente|disponible|animal|lot/i.test(oppText)) console.log('[OK] Opportunités de vente visibles');
    else console.log('[INFO] Pas d\'opportunités affichées (peut-être pas de données)');
  }

  // Onglet Commandes → tenter créer
  const cmdTab = page.locator('button, [role="tab"]').filter({ hasText: /commandes/i }).first();
  if (await cmdTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cmdTab.click();
    await page.waitForTimeout(1000);
    const { found: btnFound, modal: modalOpen } = await clickAddAndCheckModal(page);
    if (btnFound && modalOpen) {
      console.log('[OK] Modal nouvelle commande ouverte');
      await page.screenshot({ path: 'tests/screenshots/05c_commande_form.png' });
      const formText = await page.locator('.fixed.inset-0, [role="dialog"]').first().innerText().catch(() => '');

      // Vérifier sélection dynamique par type
      if (/type.*vente|animal|lot|stock|culture/i.test(formText)) console.log('[OK] Sélection type de vente présente dans formulaire commande');
      else console.log('[WARN] Sélection type de vente non trouvée dans formulaire commande');

      if (/client/i.test(formText)) console.log('[OK] Champ client présent dans commande');
      else console.log('[WARN] Champ client absent de la commande');

      if (/paiement|payé/i.test(formText)) console.log('[OK] Statut paiement présent dans commande');

      await page.keyboard.press('Escape');
    }
  }

  if (networkErrors.length > 0) networkErrors.forEach((e) => console.log(`[ERROR réseau] ${e}`));
  if (consoleErrors.length > 0) consoleErrors.slice(0, 3).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 6 : Finances
// ═════════════════════════════════════════════════════════════════════════════
test('06. Finances — recettes, dépenses, trésorerie', async ({ page }) => {
  const consoleErrors = listenConsole(page);
  const networkErrors = listenNetwork(page);

  await doLogin(page);
  const found = await goToModule(page, [/finances/i, /comptabilité/i]);
  if (!found) { console.log('[SKIP] Module Finances non trouvé'); return; }
  await page.screenshot({ path: 'tests/screenshots/06_finances.png' });

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (/recette|entrée|revenue/i.test(bodyText)) console.log('[OK] Recettes visibles');
  else console.log('[WARN] Pas de recettes affichées');

  if (/dépense|sortie/i.test(bodyText)) console.log('[OK] Dépenses visibles');
  if (/trésorerie|solde|caisse/i.test(bodyText)) console.log('[OK] Trésorerie/solde visible');
  if (/wave|orange money|mobile money/i.test(bodyText)) console.log('[OK] Moyens de paiement mobile money visibles');

  const { found: btnFound, modal: modalOpen, element } = await clickAddAndCheckModal(page);
  if (btnFound && modalOpen) {
    console.log('[OK] Modal Ajouter transaction ouverte');
    await page.screenshot({ path: 'tests/screenshots/06b_finance_form.png' });
    const formText = await element.innerText().catch(() => '');
    if (/montant/i.test(formText)) console.log('[OK] Champ montant présent');
    if (/date/i.test(formText)) console.log('[OK] Champ date présent');
    if (/catégorie|type/i.test(formText)) console.log('[OK] Champ catégorie/type présent');
    if (/wave|orange|mobile/i.test(formText)) console.log('[OK] Moyens paiement présents dans formulaire');
    await page.keyboard.press('Escape');
  }

  if (networkErrors.length > 0) networkErrors.forEach((e) => console.log(`[ERROR réseau] ${e}`));
  if (consoleErrors.length > 0) consoleErrors.slice(0, 3).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 7 : Santé / Vaccins
// ═════════════════════════════════════════════════════════════════════════════
test('07. Santé — interventions, vaccins, coûts', async ({ page }) => {
  const consoleErrors = listenConsole(page);
  const networkErrors = listenNetwork(page);

  await doLogin(page);
  const found = await goToModule(page, [/santé|sante/i, /vaccin/i]);
  if (!found) { console.log('[SKIP] Module Santé non trouvé'); return; }
  await page.screenshot({ path: 'tests/screenshots/07_sante.png' });

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (/vaccin|intervention|vétérin/i.test(bodyText)) console.log('[OK] Données santé visibles');
  if (/retard|à faire|effectué/i.test(bodyText)) console.log('[OK] Statuts vaccins visibles');

  const { found: btnFound, modal: modalOpen, element } = await clickAddAndCheckModal(page);
  if (btnFound && modalOpen) {
    await page.screenshot({ path: 'tests/screenshots/07b_sante_form.png' });
    const formText = await element.innerText().catch(() => '');
    if (/coût|montant|frais/i.test(formText)) console.log('[OK] Champ coût dans formulaire santé');
    else console.log('[WARN] Champ coût absent formulaire santé');
    if (/date.*prevue|prochaine/i.test(formText)) console.log('[OK] Date prévue dans formulaire');
    if (/vétérinaire|vet/i.test(formText)) console.log('[OK] Champ vétérinaire dans formulaire');
    await page.keyboard.press('Escape');
  }

  if (networkErrors.length > 0) networkErrors.forEach((e) => console.log(`[ERROR réseau] ${e}`));
  if (consoleErrors.length > 0) consoleErrors.slice(0, 3).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 8 : Stocks
// ═════════════════════════════════════════════════════════════════════════════
test('08. Stocks — produits, seuils, mouvements', async ({ page }) => {
  const consoleErrors = listenConsole(page);
  const networkErrors = listenNetwork(page);

  await doLogin(page);
  const found = await goToModule(page, [/stocks?/i, /stock/i]);
  if (!found) { console.log('[SKIP] Module Stocks non trouvé'); return; }
  await page.screenshot({ path: 'tests/screenshots/08_stocks.png' });

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (/seuil|critique|rupture/i.test(bodyText)) console.log('[OK] Alertes seuil critiques visibles');
  else console.log('[INFO] Pas d\'alertes seuil ou stock abondant');

  if (/alimentation|aliment|provenderie/i.test(bodyText)) console.log('[OK] Stocks alimentation visibles');

  const { found: btnFound, modal: modalOpen, element } = await clickAddAndCheckModal(page);
  if (btnFound && modalOpen) {
    await page.screenshot({ path: 'tests/screenshots/08b_stock_form.png' });
    const formText = await element.innerText().catch(() => '');
    if (/quantité|quantite/i.test(formText)) console.log('[OK] Champ quantité présent');
    if (/seuil/i.test(formText)) console.log('[OK] Champ seuil présent');
    if (/prix|coût/i.test(formText)) console.log('[OK] Champ prix présent');
    await page.keyboard.press('Escape');
  }

  if (networkErrors.length > 0) networkErrors.forEach((e) => console.log(`[ERROR réseau] ${e}`));
  if (consoleErrors.length > 0) consoleErrors.slice(0, 3).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 9 : Cultures
// ═════════════════════════════════════════════════════════════════════════════
test('09. Cultures — ajout, récolte, marge', async ({ page }) => {
  const consoleErrors = listenConsole(page);
  const networkErrors = listenNetwork(page);

  await doLogin(page);
  const found = await goToModule(page, [/cultures?/i, /culture/i, /maraîcher/i]);
  if (!found) { console.log('[SKIP] Module Cultures non trouvé'); return; }
  await page.screenshot({ path: 'tests/screenshots/09_cultures.png' });

  const { found: btnFound, modal: modalOpen, element } = await clickAddAndCheckModal(page);
  if (btnFound && modalOpen) {
    await page.screenshot({ path: 'tests/screenshots/09b_culture_form.png' });
    const formText = await element.innerText().catch(() => '');
    if (/parcelle/i.test(formText)) console.log('[OK] Champ parcelle présent');
    if (/surface/i.test(formText)) console.log('[OK] Champ surface présent');
    if (/semis|plantation/i.test(formText)) console.log('[OK] Champ date semis présent');
    if (/récolte|recolte/i.test(formText)) console.log('[OK] Date récolte présente');
    await page.keyboard.press('Escape');
  }

  if (networkErrors.length > 0) networkErrors.forEach((e) => console.log(`[ERROR réseau] ${e}`));
  if (consoleErrors.length > 0) consoleErrors.slice(0, 3).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 10 : Alertes
// ═════════════════════════════════════════════════════════════════════════════
test('10. Alertes — critique vs opportunité', async ({ page }) => {
  const consoleErrors = listenConsole(page);

  await doLogin(page);
  const found = await goToModule(page, [/alertes?/i, /alerte/i]);
  if (!found) { console.log('[SKIP] Module Alertes non trouvé'); return; }
  await page.screenshot({ path: 'tests/screenshots/10_alertes.png' });

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (/critique|urgence/i.test(bodyText)) console.log('[OK] Alertes critiques visibles');
  if (/opportunit/i.test(bodyText)) console.log('[INFO] Opportunités dans alertes — vérifier séparation critique/opportunité');
  if (/warning|attention/i.test(bodyText)) console.log('[OK] Alertes warning visibles');

  // Vérifier séparation critique / opportunité
  if (/critique.*opportunit|opportunit.*critique/i.test(bodyText)) {
    console.log('[WARN] Alertes critiques et opportunités mélangées dans la même section');
  }

  if (consoleErrors.length > 0) consoleErrors.slice(0, 3).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 11 : Traçabilité
// ═════════════════════════════════════════════════════════════════════════════
test('11. Traçabilité — événements automatiques', async ({ page }) => {
  const consoleErrors = listenConsole(page);
  const networkErrors = listenNetwork(page);

  await doLogin(page);
  const found = await goToModule(page, [/traçabilité|tracabilite/i]);
  if (!found) { console.log('[SKIP] Module Traçabilité non trouvé'); return; }
  await page.screenshot({ path: 'tests/screenshots/11_tracabilite.png' });

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (/acquisition|naissance|vente|décès|vaccination/i.test(bodyText)) console.log('[OK] Événements traçabilité visibles');
  else console.log('[INFO] Pas d\'événements traçabilité (tables peut-être vides)');

  if (networkErrors.length > 0) networkErrors.forEach((e) => console.log(`[ERROR réseau] ${e}`));
  if (consoleErrors.length > 0) consoleErrors.slice(0, 3).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 12 : Documents
// ═════════════════════════════════════════════════════════════════════════════
test('12. Documents — upload, catégories, liens entités', async ({ page }) => {
  const consoleErrors = listenConsole(page);
  const networkErrors = listenNetwork(page);

  await doLogin(page);
  const found = await goToModule(page, [/documents?/i]);
  if (!found) { console.log('[SKIP] Module Documents non trouvé'); return; }
  await page.screenshot({ path: 'tests/screenshots/12_documents.png' });

  const { found: btnFound, modal: modalOpen, element } = await clickAddAndCheckModal(page);
  if (btnFound && modalOpen) {
    await page.screenshot({ path: 'tests/screenshots/12b_doc_form.png' });
    const formText = await element.innerText().catch(() => '');
    if (/facture|reçu|ordonnance|certificat/i.test(formText)) console.log('[OK] Catégories documents présentes');
    if (/animal|lot|vente/i.test(formText)) console.log('[OK] Liaison entité présente dans formulaire document');
    if (/upload|fichier|url/i.test(formText)) console.log('[OK] Champ fichier/URL présent');
    await page.keyboard.press('Escape');
  }

  if (networkErrors.length > 0) networkErrors.forEach((e) => console.log(`[ERROR réseau] ${e}`));
  if (consoleErrors.length > 0) consoleErrors.slice(0, 3).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 13 : Smart Farm
// ═════════════════════════════════════════════════════════════════════════════
test('13. Smart Farm — capteurs, météo, simulation', async ({ page }) => {
  const consoleErrors = listenConsole(page);

  await doLogin(page);
  const found = await goToModule(page, [/smart farm|smartfarm/i, /capteurs/i]);
  if (!found) { console.log('[SKIP] Module Smart Farm non trouvé'); return; }
  await page.screenshot({ path: 'tests/screenshots/13_smartfarm.png' });

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (/simulation/i.test(bodyText)) console.log('[OK] Mode simulation clairement indiqué');
  else console.log('[WARN] Mode simulation non indiqué clairement');
  if (/température|humidité|capteur/i.test(bodyText)) console.log('[OK] Données capteurs simulées visibles');
  if (/météo|°c/i.test(bodyText)) console.log('[OK] Météo visible dans Smart Farm');

  if (consoleErrors.length > 0) consoleErrors.slice(0, 3).forEach((e) => console.log(`[ERROR console] ${e.slice(0, 150)}`));
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 14 : Responsive mobile (connecté)
// ═════════════════════════════════════════════════════════════════════════════
test('14. Mobile 390px — navigation connecté', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await doLogin(page);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/14_mobile_logged.png' });

  const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  if (overflow) console.log('[WARN] Débordement horizontal en mobile connecté');
  else console.log('[OK] Pas de débordement horizontal mobile');

  // Hamburger menu
  const menuBtn = page.locator('button').filter({ hasText: /menu|☰/i }).or(page.locator('[class*="menu"], [class*="hamburger"], [class*="burger"]')).first();
  if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('[OK] Bouton menu hamburger visible en mobile');
    await menuBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/14b_mobile_menu.png' });
  } else {
    // Chercher si la sidebar est visible ou cachée
    const sidebar = page.locator('aside, [class*="sidebar"]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    console.log(sidebarVisible ? '[INFO] Sidebar visible en mobile sans hamburger' : '[WARN] Sidebar et hamburger non visibles en mobile');
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 15 : Erreurs Supabase globales après connexion
// ═════════════════════════════════════════════════════════════════════════════
test('15. Erreurs Supabase — audit complet post-login', async ({ page }) => {
  const networkErrors = [];
  const supabaseOk = [];

  page.on('response', async (resp) => {
    if (!resp.url().includes('supabase.co')) return;
    const table = resp.url().split('/rest/v1/')[1]?.split('?')[0] || '';
    if (resp.status() >= 400) {
      const body = await resp.text().catch(() => '');
      networkErrors.push({ table, status: resp.status(), body: body.slice(0, 200) });
    } else if (table) {
      supabaseOk.push(table);
    }
  });

  await doLogin(page);
  await page.waitForTimeout(6000); // Attendre que tous les modules chargent

  console.log(`[INFO] Tables Supabase chargées avec succès: ${[...new Set(supabaseOk)].join(', ')}`);

  if (networkErrors.length === 0) {
    console.log('[OK] Aucune erreur Supabase après connexion complète');
  } else {
    for (const { table, status, body } of networkErrors) {
      console.log(`[ERROR] Supabase ${status} sur "${table}": ${body}`);
    }
  }

  await page.screenshot({ path: 'tests/screenshots/15_supabase_loaded.png', fullPage: false });
});
