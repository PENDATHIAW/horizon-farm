import { expect, test } from '@playwright/test';
import { assertNoBadUiText, collectRuntimeErrors, waitForAppReady } from './helpers.js';

const LOGIN = process.env.E2E_LOGIN || 'penda';
const PASSWORD = process.env.E2E_PASSWORD || 'Mariemediatta10#';
const stamp = () => `TEST JURY ${Date.now()}`;

const FORM_ACTIONS = [
  { module: 'Stock', button: /Créer \/ réceptionner stock/i, marker: /stock|aliment/i, expectsModal: true },
  { module: 'Ventes', button: /Nouvelle vente/i, secondaryButton: /Nouvelle vente guidée|Nouvelle vente/i, marker: /vente|commande/i },
  { module: 'Clients', button: /Nouveau client/i, marker: /client/i, expectsModal: true },
  { module: 'Fournisseurs', button: /Nouveau fournisseur/i, marker: /fournisseur/i, expectsModal: true },
  { module: 'Documents', button: /Ajouter document/i, marker: /document|preuve|facture/i, expectsModal: true },
  { module: 'Tâches', button: /Ajouter tâche/i, marker: /tâche|action/i, expectsModal: true },
  { module: 'Alertes', button: /Nouvelle alerte/i, marker: /alerte/i, expectsModal: true },
  { module: 'Cultures', button: /Ajouter culture/i, marker: /culture|parcelle/i, expectsModal: true },
  { module: 'Équipements', button: /Ajouter équipement/i, marker: /équipement|materiel|matériel/i, expectsModal: true },
  { module: 'Smart Farm', button: /Ajouter capteur/i, marker: /capteur/i, expectsModal: true },
  { module: 'Traçabilité', button: /Ajouter un fait/i, marker: /fait|trace|historique/i, expectsModal: true },
  { module: 'Gestion du système', button: /Créer utilisateur/i, marker: /utilisateur|accès/i, expectsModal: true },
];

async function login(page) {
  await page.goto('/');
  await expect(page.getByText(/Pilotez votre ferme|De la terre|Connexion/i)).toBeVisible({ timeout: 20_000 });
  await page.locator('#login').fill(LOGIN);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await expect(page.getByText(/Accueil/i).first()).toBeVisible({ timeout: 25_000 });
  await waitForAppReady(page);
}

async function openModule(page, name) {
  await closeBlockingModal(page);
  await page.locator('nav, aside').getByText(name, { exact: true }).first().click();
  await waitForAppReady(page);
  await assertNoBadUiText(page, `Avant formulaire ${name}`);
}

async function closeBlockingModal(page) {
  const modal = page.locator('.fixed.inset-0:visible').last();
  if (!(await modal.count())) return;
  const close = modal.getByRole('button', { name: /annuler|fermer/i }).first();
  if (await close.count()) await close.click().catch(() => {});
  else await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
}

function valueFor(label, type, moduleName, runId) {
  const raw = `${label || ''} ${moduleName}`.toLowerCase();
  if (type === 'date') return '2026-05-26';
  if (type === 'email') return `jury-${runId}@example.com`;
  if (type === 'tel') return '771234567';
  if (type === 'number') {
    if (/prix|montant|co[uû]t|valeur|salaire|dette|pay[eé]|reçu|recu/.test(raw)) return '12500';
    if (/seuil|min|alerte/.test(raw)) return '5';
    if (/poids/.test(raw)) return '82';
    if (/surface/.test(raw)) return '0.25';
    if (/effectif|nombre/.test(raw)) return '30';
    return '12';
  }
  if (/t[ée]l[ée]phone|whatsapp|contact/.test(raw)) return '771234567';
  if (/email/.test(raw)) return `jury-${runId}@example.com`;
  if (/id|r[ée]f[ée]rence|code/.test(raw)) return `JURY-${runId}`;
  if (/nom|produit|titre|poste|culture|client|fournisseur|capteur|[ée]quipement|animal|lot|action|alerte/.test(raw)) return `${stamp()} ${moduleName}`;
  if (/adresse|localisation|emplacement|parcelle/.test(raw)) return 'Parcelle test nord';
  if (/note|commentaire|description|motif|preuve|source|lien|fichier/.test(raw)) return `${stamp()} - saisie terrain contrôlée`;
  return `${stamp()} ${moduleName}`;
}

async function fillForm(scope, moduleName, runId) {
  if (moduleName === 'Cultures') {
    await scope.getByLabel(/Nom culture/i).fill(`${stamp()} Cultures`).catch(() => {});
    await scope.getByLabel(/Parcelle/i).fill('Parcelle test nord').catch(() => {});
    await scope.getByLabel(/Campagne/i).fill('Campagne jury').catch(() => {});
    await scope.getByLabel(/Surface/i).fill('0.25').catch(() => {});
    await scope.getByLabel(/Quantité récoltée/i).fill('100').catch(() => {});
    await scope.getByLabel(/Prix vente unitaire/i).fill('900').catch(() => {});
    await scope.getByLabel(/Notes/i).fill('TEST JURY - culture créée depuis le parcours réel').catch(() => {});
  }

  const controls = scope.locator('input:visible, textarea:visible, select:visible');
  const count = await controls.count();
  for (let i = 0; i < count; i += 1) {
    const control = controls.nth(i);
    if (!(await control.isVisible().catch(() => false))) continue;
    if (await control.isDisabled().catch(() => true)) continue;

    const tag = await control.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    const type = await control.getAttribute('type').catch(() => 'text');
    const label = await control.evaluate((el) => {
      const text = el.closest('label')?.innerText || el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.id || el.name || '';
      return text.replace(/\s+/g, ' ').trim();
    }).catch(() => '');
    const lower = `${label} ${type}`.toLowerCase();
    const currentValue = await control.inputValue().catch(() => '');

    if (/recherche globale|rechercher|search|photo|file/.test(lower) || type === 'file' || type === 'checkbox') continue;
    if (/^unit[eé]/.test(lower) && currentValue) continue;

    if (tag === 'select') {
      const value = await control.evaluate((el) => {
        const option = Array.from(el.options).find((candidate) => candidate.value && !candidate.disabled);
        return option?.value || '';
      });
      if (value) await control.selectOption(value).catch(() => {});
      continue;
    }

    await control.fill(valueFor(label, type || 'text', moduleName, runId)).catch(() => {});
  }
}

async function submitVisibleForm(page, moduleName, action = {}) {
  const runId = String(Date.now()).slice(-8);
  let modal = page.locator('.fixed.inset-0:visible').last();
  if (!(await modal.count()) && action.secondaryButton) {
    const secondary = page.locator('main button:visible').filter({ hasText: action.secondaryButton }).last();
    if (await secondary.count()) {
      await secondary.click();
      await page.waitForTimeout(700);
    }
    modal = page.locator('.fixed.inset-0:visible').last();
  }
  let scope = (await modal.count()) && (await modal.locator('input:visible, textarea:visible, select:visible, button:visible').count()) ? modal : page.locator('main');

  for (let step = 0; step < 6; step += 1) {
    await fillForm(scope, moduleName, runId);
    const submitCandidates = scope.getByRole('button', {
      name: /continuer|enregistrer|ajouter|créer|creer|valider|sauvegarder/i,
    });
    if (step > 0 && (await submitCandidates.count()) === 0) break;
    const submit = submitCandidates.last();
    await expect(submit, `Bouton validation introuvable pour ${moduleName}`).toBeVisible({ timeout: 5_000 });
    const label = (await submit.innerText().catch(() => '')).trim();
    await submit.click();
    await page.waitForTimeout(900);
    if (!/continuer/i.test(label)) break;
    modal = page.locator('.fixed.inset-0:visible').last();
    scope = (await modal.count()) && (await modal.locator('input:visible, textarea:visible, select:visible, button:visible').count()) ? modal : page.locator('main');
  }

  const visibleError = page.locator('text=/obligatoire|impossible|erreur|error|failed|SupabaseError|PostgrestError/i').first();
  await expect(visibleError, `Erreur visible après soumission ${moduleName}`).toHaveCount(0, { timeout: 3_000 });
  const blockingModal = page.locator('.fixed.inset-0:visible').last();
  if (await blockingModal.count()) {
    if (moduleName === 'Cultures') {
      await blockingModal.getByLabel(/Nom culture/i).fill(`${stamp()} Cultures`).catch(() => {});
      await blockingModal.getByLabel(/Parcelle/i).fill('Parcelle test nord').catch(() => {});
      await blockingModal.getByLabel(/Surface/i).fill('0.25').catch(() => {});
      await blockingModal.getByRole('button', { name: /ajouter|enregistrer/i }).last().click().catch(() => {});
      await page.waitForTimeout(900);
    }
    await closeBlockingModal(page);
  }
  await assertNoBadUiText(page, `Après soumission ${moduleName}`);
  await page.keyboard.press('Escape').catch(() => {});
}

test.describe('Jury utilisateur - soumissions réelles des formulaires', () => {
  test.setTimeout(120_000);
  test.skip(process.env.E2E_REAL_SUBMISSIONS !== '1', 'Soumissions réelles destructives : lancer avec E2E_REAL_SUBMISSIONS=1 sur un environnement sans données à préserver.');

  for (const action of FORM_ACTIONS) {
    test(`soumet le formulaire principal ${action.module}`, async ({ page }) => {
      const runtime = collectRuntimeErrors(page);
      await login(page);
      await openModule(page, action.module);
      const button = page.locator('main button:visible').filter({ hasText: action.button }).first();
      await expect(button, `Bouton formulaire introuvable: ${action.module}`).toBeVisible({ timeout: 10_000 });
      await button.click();
      if (action.expectsModal) await page.locator('.fixed.inset-0:visible').last().waitFor({ state: 'visible', timeout: 8_000 });
      await page.waitForTimeout(900);
      await expect(page.locator('body')).toContainText(action.marker, { timeout: 10_000 });
      await submitVisibleForm(page, action.module, action);

      runtime.assertClean();
    });
  }
});
