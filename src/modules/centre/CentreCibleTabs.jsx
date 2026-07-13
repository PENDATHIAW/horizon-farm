/**
 * Onglets cibles du Centre décisionnel (chantier 3) : Écarts et Risques.
 *
 * Écarts : lecture des écarts calculés par Finance et Objectifs, jamais
 * recalculés ici (le même service que Finance est lu, pas dupliqué).
 * Risques : registre dérivé, jamais une saisie. Six risques structurels
 * reliés aux indicateurs et alertes existants ; le statut (maîtrisé, sous
 * surveillance, critique) est calculé depuis ces sources.
 */
import { useMemo } from 'react';
import { buildFinancialPlanVsActual } from '../../services/financialPlanService.js';
import { filtrerAlertes } from '../../components/uniques/ListeAlertes.jsx';
import { filtrerTaches } from '../../components/uniques/ListeTaches.jsx';

const texte = (v) => String(v || '').trim().toLowerCase();
const aujourdHui = () => new Date().toISOString().slice(0, 10);

const alertesActivesPour = (alertes, codes = [], modules = []) => filtrerAlertes(alertes, { statut: 'actives', limite: 500 })
  .filter((a) => codes.includes(texte(a.code || a.alert_code))
    || modules.includes(texte(a.module_source)));

const statutDepuis = (critiques, signaux) => (critiques > 0 ? 'critique' : signaux > 0 ? 'sous surveillance' : 'maîtrisé');

/**
 * Registre dérivé des six risques structurels de la ferme.
 * Chaque risque cite ses sources ; aucune probabilité saisie à la main.
 */
export function deriverRisquesStructurels({ alertes = [], taches = [], kpis = null } = {}) {
  const jour = aujourdHui();
  const critiques = (liste) => liste.filter((a) => ['critique', 'critical'].includes(texte(a.severity))).length;

  const sanitaire = alertesActivesPour(alertes, ['mortalite_anormale', 'vaccination_en_retard'], []);
  const aliment = alertesActivesPour(alertes, ['aliment_hors_courbe', 'stock_sous_seuil'], []);
  const eau = alertesActivesPour(alertes, [], ['smartfarm']).filter((a) => texte(a.title).includes('eau') || texte(a.message).includes('eau'));
  const commercial = alertesActivesPour(alertes, ['creance_echue', 'facture_livraison_manquante'], []);
  const tresorerieAlertes = alertesActivesPour(alertes, ['tresorerie_faible', 'budget_depasse'], []);
  const tresorerieNegative = (kpis?.finance?.resultatAllTime ?? 0) < 0;
  const tachesCritiquesEnRetard = filtrerTaches(taches, { statut: 'ouvertes', priorite: 'critique', limite: 500 })
    .filter((t) => String(t.due_date || '').slice(0, 10) < jour);

  return [
    { id: 'sanitaire', libelle: 'Sanitaire', sources: 'mortalité et vaccinations en retard', signaux: sanitaire.length, statut: statutDepuis(critiques(sanitaire), sanitaire.length), module: 'elevage' },
    { id: 'aliment', libelle: "Coût de l'aliment", sources: 'consommation hors courbe et stock d\'aliment', signaux: aliment.length, statut: statutDepuis(critiques(aliment), aliment.length), module: 'achats_stock' },
    { id: 'eau', libelle: "Accès à l'eau", sources: 'consommation anormale et pannes du système d\'eau', signaux: eau.length, statut: statutDepuis(critiques(eau), eau.length), module: 'smartfarm' },
    { id: 'commercial', libelle: 'Commercial', sources: 'créances échues et ventes par rapport au plan', signaux: commercial.length, statut: statutDepuis(critiques(commercial), commercial.length), module: 'commercial' },
    { id: 'tresorerie', libelle: 'Trésorerie', sources: 'jours de trésorerie et budget', signaux: tresorerieAlertes.length + (tresorerieNegative ? 1 : 0), statut: statutDepuis(critiques(tresorerieAlertes) + (tresorerieNegative ? 1 : 0), tresorerieAlertes.length), module: 'finance_pilotage' },
    { id: 'execution', libelle: 'Exécution', sources: 'tâches critiques en retard', signaux: tachesCritiquesEnRetard.length, statut: statutDepuis(tachesCritiquesEnRetard.length, tachesCritiquesEnRetard.length), module: 'activite_suivi' },
  ];
}

const STYLE_STATUT = {
  'critique': 'border-red-200 bg-red-50 text-red-700',
  'sous surveillance': 'border-amber-200 bg-amber-50 text-amber-800',
  'maîtrisé': 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

export function CentreRisquesTab({ alertes = [], taches = [], kpis = null, onNavigate }) {
  const risques = useMemo(() => deriverRisquesStructurels({ alertes, taches, kpis }), [alertes, taches, kpis]);
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6b12]">Registre des risques structurels</p>
      <p className="mt-1 text-sm text-[#8a7456]">
        Statuts calculés depuis les alertes et indicateurs existants. Ce registre alimente la
        section risques du rapport financeur ; aucune fiche manuelle.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {risques.map((risque) => (
          <button
            key={risque.id}
            type="button"
            onClick={() => onNavigate?.(risque.module)}
            className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-[#2f2415]">{risque.libelle}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${STYLE_STATUT[risque.statut]}`}>{risque.statut}</span>
            </div>
            <p className="mt-2 text-xs text-[#8a7456]">Sources : {risque.sources}</p>
            <p className="mt-1 text-xs text-[#8a7456]">{risque.signaux} signal(aux) actif(s)</p>
          </button>
        ))}
      </div>
    </section>
  );
}

export function CentreEcartsTab({ dataMap = {}, periodScope = {}, onNavigate }) {
  const plan = useMemo(() => {
    try {
      return buildFinancialPlanVsActual(dataMap, undefined, { periodScope });
    } catch {
      return null;
    }
  }, [dataMap, periodScope]);
  const lignes = plan?.rows || plan?.lines || [];
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6b12]">Écarts prévisionnel / réel</p>
      <p className="mt-1 text-sm text-[#8a7456]">
        Lecture des écarts calculés par Finance et Objectifs. Rien n'est recalculé ici.
      </p>
      {plan == null || (!lignes.length && plan.revenueAttainment == null && plan.annualAttainment == null) ? (
        <p className="mt-3 text-sm text-[#8a7456]">Rien à afficher pour l'instant. Renseigner le plan dans Objectifs & Croissance.</p>
      ) : (
        <div className="mt-3 space-y-2 text-sm text-[#2f2415]">
          {plan.revenueAttainment != null ? <p>Atteinte du plan de recettes : <b>{Math.round(plan.revenueAttainment)}%</b></p> : null}
          {plan.annualAttainment != null ? <p>Atteinte annuelle : <b>{Math.round(plan.annualAttainment)}%</b></p> : null}
          {lignes.slice(0, 8).map((ligne, index) => (
            <p key={ligne.id || index} className="text-xs text-[#8a7456]">
              {ligne.label || ligne.libelle || ligne.name} : prévu {ligne.planned ?? ligne.prevu ?? '·'} / réel {ligne.actual ?? ligne.reel ?? '·'}
            </p>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onNavigate?.('finance_pilotage', { tab: 'Écarts budget' })} className="rounded-xl border border-[#d6c3a0] bg-white px-3 py-1.5 text-xs font-black text-[#2f2415]">Ouvrir Finance & Pilotage</button>
        <button type="button" onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Prévisionnel vs réel' })} className="rounded-xl border border-[#d6c3a0] bg-white px-3 py-1.5 text-xs font-black text-[#2f2415]">Ouvrir Objectifs & Croissance</button>
      </div>
    </section>
  );
}
