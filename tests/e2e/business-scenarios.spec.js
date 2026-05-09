import { expect, test } from '@playwright/test';
import { assertNoBadUiText, closeTransientUi, collectRuntimeErrors, goToModule, login } from './helpers.js';

const MODULE_ACTIONS = [
  { module: 'Ventes', actions: [/nouvelle vente/i, /nouvelle commande/i, /encaisser/i, /paiement/i, /facture/i] },
  { module: 'Stock', actions: [/réceptionner/i, /receptionner/i, /utilisation/i, /sortie/i, /perte/i, /ajouter/i] },
  { module: 'Sante', actions: [/nouveau/i, /créer/i, /creer/i, /suivi/i, /biosécurité/i, /biosecurite/i] },
  { module: 'Clients', actions: [/relancer/i, /whatsapp/i, /nouveau/i, /ajouter/i] },
  { module: 'Fournisseurs', actions: [/commander/i, /payer/i, /dette/i, /nouveau/i, /ajouter/i] },
  { module: 'Cultures', actions: [/récolte/i, /recolte/i, /intrant/i, /risque/i, /nouveau/i, /ajouter/i] },
  { module: 'Avicole', actions: [/modifier/i, /ramassage œufs/i, /ramassage oeufs/i, /ajouter lot/i, /nouveau/i] },
];

const LINKED_FIELD_PATTERNS = [/module/i, /source/i, /client/i, /fournisseur/i, /animal/i, /lot/i, /stock/i, /culture/i, /parcelle/i, /campagne/i];
const EMPTY_STATE_PATTERN = /aucun|aucune|indisponible|non disponible|pas de|créez d'abord|creez d'abord|vide|inactif|clôturé|cloture/i;

async function clickFirstAvailableAction(page, labels) {
  for (const label of labels) {
    const button = page.getByRole('button', { name: label }).first();
    if (await button.count()) {
      const visible = await button.isVisible().catch(() => false);
      const disabled = await button.isDisabled().catch(() => false);
      if (visible && !disabled) {
        await button.click();
        await page.waitForTimeout(700);
        return label.toString();
      }
    }
    const textAction = page.getByText(label).first();
    if (await textAction.count()) {
      const visible = await textAction.isVisible().catch(() => false);
      if (visible) {
        await textAction.click();
        await page.waitForTimeout(700);
        return label.toString();
      }
    }
  }
  return null;
}

async function assertLinkedControlsAreCoherent(page, contextLabel) {
  const selects = page.locator('select');
  const selectCount = await selects.count();
  const bodyText = await page.locator('body').innerText().catch(() => '');

  for (let index = 0; index < selectCount; index += 1) {
    const select = selects.nth(index);
    if (!(await select.isVisible().catch(() => false))) continue;

    const name = [
      await select.getAttribute('name').catch(() => ''),
      await select.getAttribute('aria-label').catch(() => ''),
      await select.getAttribute('placeholder').catch(() => ''),
      await select.locator('xpath=preceding::label[1]').innerText().catch(() => ''),
    ].join(' ');

    const isLinkedControl = LINKED_FIELD_PATTERNS.some((pattern) => pattern.test(name));
    if (!isLinkedControl) continue;

    const options = await select.locator('option').allTextContents().catch(() => []);
    const meaningfulOptions = options.map((item) => item.trim()).filter((item) => item && !/choisir|selectionner|sélectionner|aucun|aucune/i.test(item));
    const disabled = await select.isDisabled().catch(() => false);

    if (meaningfulOptions.length === 0) {
      expect(disabled || EMPTY_STATE_PATTERN.test(bodyText), `${contextLabel}: liste liee active vide sans explication utilisateur (${name.trim() || `select ${index}`})`).toBeTruthy();
    }
  }
}

test.describe('Horizon Farm — scénarios métier QA', () => {
  test('ouvrir les actions métier clés sans erreur ni message technique', async ({ page }) => {
    const runtime = collectRuntimeErrors(page);
    await login(page);

    for (const scenario of MODULE_ACTIONS) {
      await goToModule(page, scenario.module);
      const clicked = await clickFirstAvailableAction(page, scenario.actions);
      await assertNoBadUiText(page, `Action ${scenario.module}${clicked ? ` (${clicked})` : ''}`);
      await assertLinkedControlsAreCoherent(page, `Action ${scenario.module}`);
      await closeTransientUi(page);
    }

    runtime.assertClean();
  });

  test('les modules critiques affichent des donnees ou des etats vides comprehensibles', async ({ page }) => {
    const runtime = collectRuntimeErrors(page);
    await login(page);

    for (const moduleName of ['Ventes', 'Stock', 'Sante', 'Clients', 'Fournisseurs', 'Cultures', 'Avicole']) {
      await goToModule(page, moduleName);
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length, `${moduleName}: module vide sans message`).toBeGreaterThan(80);
      await assertNoBadUiText(page, `Module critique ${moduleName}`);
    }

    runtime.assertClean();
  });
});
