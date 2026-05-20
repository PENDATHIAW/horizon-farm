export const activeHorizonFarmAuditRules = [
  {
    id: 'DATA_MODE_REAL_VS_SIMULATED',
    title: 'Distinguer données réelles et données simulées',
    severity: 'critique',
    rule: 'Le testeur doit toujours identifier le mode actif. En données réelles, un module vide n’est pas automatiquement une anomalie si aucune donnée n’a encore été saisie. En données simulées, les parcours doivent être testables et suffisamment alimentés.',
    expectedBehavior: 'Le rapport doit indiquer mode_donnees: reel | simule | inconnu, puis séparer absence normale de données réelles et anomalie de données simulées.',
    improvements: [
      'Afficher un badge clair Données réelles ou Données simulées dans le rapport d’audit.',
      'Ne pas pénaliser les modules vides en données réelles sans contexte.',
      'Utiliser les données simulées pour tester formulaires, interconnexions et scénarios métier.',
    ],
  },
  {
    id: 'HEALTH_PROOF_PHOTO_URL',
    title: 'Preuve santé par URL de photo',
    severity: 'haute',
    rule: 'Pour Santé, la preuve attendue est une URL de photo. L’audit ne doit plus demander upload fichier/photo local pour la preuve santé.',
    expectedBehavior: 'Les formulaires santé doivent accepter une URL photo valide, afficher ou prévisualiser la photo si possible, et lier cette URL à Documents/Traçabilité quand pertinent.',
    improvements: [
      'Renommer le champ en URL photo preuve ou URL ordonnance photo.',
      'Valider que l’URL commence par http:// ou https://.',
      'Afficher un aperçu ou un lien ouvrable de la photo.',
      'Signaler seulement les preuves santé sans URL ou avec URL invalide.',
    ],
  },
  {
    id: 'ANIMAL_WEIGHING_15_DAYS_J_MINUS_1',
    title: 'Pesées animaux tous les 15 jours avec rappel J-1',
    severity: 'critique',
    rule: 'Chaque animal actif doit avoir une pesée tous les 15 jours. Un rappel doit être généré la veille, donc à J-1 de la prochaine pesée.',
    expectedBehavior: 'Après une pesée, prochaine_pesee = date_pesee + 15 jours. rappel_pesee = prochaine_pesee - 1 jour. Si le rappel n’existe pas ou si la pesée est dépassée, l’audit doit le signaler.',
    improvements: [
      'Afficher prochaine pesée et rappel J-1 dans la fiche animal.',
      'Créer automatiquement une tâche ou alerte J-1.',
      'Bloquer le score OK si un animal actif n’a ni prochaine pesée ni rappel.',
      'Ne pas exiger de pesée pour un animal vendu, mort ou clôturé.',
    ],
  },
];

export const activeAuditPromptAddendum = `
Règles actives Horizon Farm à appliquer en priorité sur les anciennes consignes :

1. Données réelles / données simulées
- Toujours identifier le mode actif.
- En données réelles, une absence de données peut être normale si rien n’a encore été saisi.
- En données simulées, les scénarios doivent être alimentés pour tester les parcours.
- Le rapport doit distinguer absence normale, donnée manquante, bug et simulation insuffisante.

2. Preuve santé
- La preuve santé attendue est une URL de photo.
- Ne pas demander upload fichier/photo local pour la santé.
- Vérifier URL photo valide, visible ou ouvrable.
- Signaler uniquement URL absente, invalide ou non liée au bon événement santé.

3. Pesées animaux
- Pesée tous les 15 jours pour les animaux actifs.
- Rappel automatique à J-1 avant la prochaine pesée.
- Après chaque pesée : prochaine_pesee = date_pesee + 15 jours ; rappel = prochaine_pesee - 1 jour.
- Les animaux vendus, morts ou clôturés ne doivent pas générer de nouveau rappel de pesée.
`;

export default activeHorizonFarmAuditRules;
