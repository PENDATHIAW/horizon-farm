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
  'critique': 'border-urgent bg-urgent-bg text-urgent',
  'sous surveillance': 'border-vigilance bg-vigilance-bg text-horizon-dark',
  'maîtrisé': 'border-positive bg-positive-bg text-positive',
};

export function CentreRisquesTab({ alertes = [], taches = [], kpis = null, onNavigate }) {
  const risques = useMemo(() => deriverRisquesStructurels({ alertes, taches, kpis }), [alertes, taches, kpis]);
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-normal text-horizon-dark">Registre des risques structurels</p>
      <p className="mt-1 text-sm text-slate">
        Statuts calculés depuis les alertes et indicateurs existants. Ce registre alimente la
        section risques du rapport financeur ; aucune fiche manuelle.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {risques.map((risque) => (
          <button
            key={risque.id}
            type="button"
            onClick={() => onNavigate?.(risque.module)}
            className="rounded-2xl border border-line bg-card p-4 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-earth">{risque.libelle}</p>
              <span className={`rounded-full border px-2 py-1 text-meta font-semibold ${STYLE_STATUT[risque.statut]}`}>{risque.statut}</span>
            </div>
            <p className="mt-2 text-xs text-slate">Sources : {risque.sources}</p>
            <p className="mt-1 text-xs text-slate">{risque.signaux} signal(aux) actif(s)</p>
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
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-normal text-horizon-dark">Écarts prévisionnel / réel</p>
      <p className="mt-1 text-sm text-slate">
        Lecture des écarts calculés par Finance et Objectifs. Rien n'est recalculé ici.
      </p>
      {plan == null || (!lignes.length && plan.revenueAttainment == null && plan.annualAttainment == null) ? (
        <p className="mt-3 text-sm text-slate">Rien à afficher pour l'instant. Renseigner le plan dans Objectifs & Croissance.</p>
      ) : (
        <div className="mt-3 space-y-2 text-sm text-earth">
          {plan.revenueAttainment != null ? <p>Atteinte du plan de recettes : <b>{Math.round(plan.revenueAttainment)}%</b></p> : null}
          {plan.annualAttainment != null ? <p>Atteinte annuelle : <b>{Math.round(plan.annualAttainment)}%</b></p> : null}
          {lignes.slice(0, 8).map((ligne, index) => (
            <p key={ligne.id || index} className="text-xs text-slate">
              {ligne.label || ligne.libelle || ligne.name} : prévu {ligne.planned ?? ligne.prevu ?? '·'} / réel {ligne.actual ?? ligne.reel ?? '·'}
            </p>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onNavigate?.('finance_pilotage', { tab: 'Écarts budget' })} className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-earth">Ouvrir Finance & Pilotage</button>
        <button type="button" onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Prévisionnel vs réel' })} className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-earth">Ouvrir Objectifs & Croissance</button>
      </div>
    </section>
  );
}
