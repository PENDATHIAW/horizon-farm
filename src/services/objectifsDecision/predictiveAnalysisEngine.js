/**
 * Analyses prédictives — stress thermique & valorisation biomasse (fumier/fientes).
 */

const num = (v = 0) => Number(v || 0) || 0;

/**
 * Détecte un stress thermique sur un lot pondeuses et estime la perte financière.
 */
export function checkThermalStress(
  lotId,
  currentTemp,
  currentPonteRate,
  standardPonteRate,
  headCount,
  eggPrice,
) {
  const temp = num(currentTemp);
  const current = num(currentPonteRate);
  const standard = num(standardPonteRate);
  const birds = num(headCount);
  const price = num(eggPrice) || 25;
  const drop = standard - current;

  console.info('[checkThermalStress]', {
    lotId,
    currentTemp: temp,
    currentPonteRate: current,
    standardPonteRate: standard,
    drop,
    headCount: birds,
  });

  if (temp < 35 || drop < 3) {
    return {
      lotId,
      alert: false,
      status: 'normal',
      message: null,
      perte_financiere_fcfa: 0,
      oeufs_perdus: 0,
    };
  }

  const oeufsPerdus = (drop / 100) * birds;
  const perteFinanciere = Math.round(oeufsPerdus * price);

  const result = {
    lotId,
    alert: true,
    status: 'Alerte Rouge : Stress Thermique',
    currentTemp: temp,
    dropPct: Math.round(drop * 10) / 10,
    oeufs_perdus: Math.round(oeufsPerdus),
    perte_financiere_fcfa: perteFinanciere,
    message: `Température critique détectée (${temp}°C). Chute de ponte liée à la chaleur. Perte estimée : ${perteFinanciere.toLocaleString('fr-FR')} FCFA/jour. Action : Activer la brumisation et distribuer de la vitamine C anti-stress.`,
  };

  console.warn('[checkThermalStress] ALERTE', result);
  return result;
}

/**
 * Valorisation biomasse fientes/fumier → équivalence engrais NPK pour maraîchage futur.
 */
export function calculateBiomassValue(poulesCount, bovinsCount, npkBagPrice = 15000) {
  const poules = num(poulesCount);
  const bovins = num(bovinsCount);
  const bagPrice = num(npkBagPrice) || 15000;

  const fientesTonnes = (poules * 0.15 * 30 / 1000) * 0.4;
  const fumierBovinTonnes = (bovins * 10 * 30 / 1000);
  const sacsNpkEconomises = Math.round(fientesTonnes * 3) + Math.round(fumierBovinTonnes * 1.5);
  const economieTotale = sacsNpkEconomises * bagPrice;

  const result = {
    fientes_tonnes: Math.round(fientesTonnes * 100) / 100,
    fumier_bovin_tonnes: Math.round(fumierBovinTonnes * 100) / 100,
    sacs_npk_economises: sacsNpkEconomises,
    economie_totale_fcfa: economieTotale,
    npk_bag_price: bagPrice,
  };

  console.info('[calculateBiomassValue]', result);
  return result;
}

export default { checkThermalStress, calculateBiomassValue };
