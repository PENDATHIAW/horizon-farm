import { animalScenarioSeeds } from './animalScenarioSeeds';

export const mergeAnimalSeeds = (baseAnimals = []) => [
  ...baseAnimals,
  ...animalScenarioSeeds.filter((scenario) => !baseAnimals.some((animal) => animal.id === scenario.id)),
];
