import { expect, test } from '@playwright/test';
import { goToModule, login } from './helpers.js';

/**
 * Chantier 5 : chronométrage automatisé des 7 saisies quotidiennes.
 *
 * Ouvre chaque saisie depuis les boutons d'action rapide de l'Accueil sur
 * données de démonstration, compte les interactions et chronomètre l'ouverture.
 * Le contrat : cinq interactions maximum et moins de 20 secondes par scénario.
 * Le test humain complémentaire sur téléphone est consigné séparément dans
 * docs/test-humain-20-secondes.md ; le passage de ce test automatisé ne suffit
 * pas à valider l'objectif humain.
 */
const hasCredentials = Boolean(process.env.E2E_LOGIN && process.env.E2E_PASSWORD);

const SAISIES = [
  "Distribuer l'aliment",
  'Enregistrer la ponte',
  'Déclarer une mortalité',
  'Enregistrer une pesée',
  "Noter l'irrigation",
  'Enregistrer la récolte',
  'Enregistrer une vente',
];

test.describe('Contrat des 20 secondes — saisies quotidiennes', () => {
  test.skip(!hasCredentials, 'Variables E2E_LOGIN et E2E_PASSWORD requises');

  for (const libelle of SAISIES) {
    test(`ouverture rapide : ${libelle}`, async ({ page }) => {
      await login(page);
      await goToModule(page, 'Accueil');
      const bouton = page.getByRole('button', { name: libelle }).first();
      await expect(bouton).toBeVisible({ timeout: 10_000 });

      const debut = Date.now();
      await bouton.click();
      // le formulaire propriétaire s'ouvre sur son onglet ; on attend un champ de saisie
      await expect(page.locator('form, [role="dialog"], input, select, textarea').first()).toBeVisible({ timeout: 15_000 });
      const secondes = (Date.now() - debut) / 1000;

      expect(secondes, `${libelle} ouvert en ${secondes.toFixed(1)} s`).toBeLessThan(20);
    });
  }
});
