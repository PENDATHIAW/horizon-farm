/**
 * Composant unique des cartes d'indicateurs (chantier 4).
 * La valeur vient du catalogue central (src/config/catalogueKpi.js), jamais
 * d'un calcul local. Chaque carte affiche sa période et pointe vers son
 * module propriétaire en un clic.
 */
import { useMemo } from 'react';
import { t } from '../../i18n/fr/index.js';
import { CATALOGUE_KPI, valeurKpi } from '../../config/catalogueKpi.js';
import { moduleLabel } from '../../config/modules.config.js';
import { fmtCurrency } from '../../utils/format.js';

const formatterValeur = (valeur, unite) => {
  if (valeur == null) return t('composants.kpi.valeurIndisponible');
  if (unite === 'FCFA') return fmtCurrency(valeur);
  return `${Number(valeur).toLocaleString('fr-FR')} ${unite || ''}`.trim();
};

export default function CarteKPI({ code, periode = '', donnees = {}, kpis = null, periodScope = {}, onNavigate }) {
  const resultat = useMemo(
    () => valeurKpi(code, donnees, { periodScope, kpis }),
    [code, donnees, periodScope, kpis],
  );
  const entree = resultat.entree || CATALOGUE_KPI[code];
  if (!entree) return null;

  const libellePeriode = periode || entree.periodeParDefaut;
  const cliquable = typeof onNavigate === 'function';
  const contenu = (
    <>
      <div className="text-2xl font-black tracking-tight text-[#2f2415] break-words">
        {formatterValeur(resultat.valeur, entree.unite)}
      </div>
      <div className="mt-1 text-xs font-bold uppercase tracking-wide text-[#8a7456]">{entree.libelle}</div>
      <div className="mt-1 text-xs text-[#8a7456]/80">{t('composants.kpi.periode', { periode: libellePeriode })}</div>
      {cliquable ? (
        <div className="mt-3 text-xs font-black text-[#9a6b12]">
          {t('composants.kpi.voirSource', { module: moduleLabel(entree.proprietaire) })} →
        </div>
      ) : null}
    </>
  );

  if (cliquable) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(entree.proprietaire)}
        aria-label={entree.libelle}
        className="w-full rounded-3xl border border-[#eadcc2] bg-white/90 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#c9a96a] hover:shadow-md"
      >
        {contenu}
      </button>
    );
  }
  return <div className="rounded-3xl border border-[#eadcc2] bg-white/90 p-5 shadow-sm">{contenu}</div>;
}
