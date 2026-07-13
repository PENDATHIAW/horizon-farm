/**
 * Accueil conforme à la structure cible (chantier 3) :
 * Vue du jour · Pilotage · Mes actions.
 *
 * Vue du jour : priorités (alertes critiques + tâches urgentes), production du
 * jour, ventes et encaissements, stocks sensibles, derniers mouvements (lecture
 * du journal). Aucun formulaire ici : les actions rapides ouvrent les
 * formulaires des modules propriétaires.
 * Pilotage : huit indicateurs maximum lus du catalogue central, chaque carte
 * affiche sa période et pointe vers son module. Masqué pour le rôle terrain
 * (aucune donnée financière pour ce rôle).
 * Mes actions : composant ListeTaches filtré sur l'utilisateur connecté.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import JournalEvenements from '../../components/uniques/JournalEvenements.jsx';
import ListeTaches, { filtrerTaches } from '../../components/uniques/ListeTaches.jsx';
import ListeAlertes from '../../components/uniques/ListeAlertes.jsx';
import CarteKPI from '../../components/uniques/CarteKPI.jsx';
import { runKpiEngine } from '../../services/kpiEngine/index.js';
import { resolveDashboardTab } from '../../utils/commercialNavigation.js';

const ROLES_TERRAIN = new Set(['terrain', 'farm_agent', 'employe', 'farm_readonly']);

/** Les 7 saisies quotidiennes : chaque bouton ouvre le formulaire de son module propriétaire. */
export const ACTIONS_RAPIDES_QUOTIDIENNES = [
  { id: 'distribution', libelle: "Distribuer l'aliment", module: 'elevage', tab: 'Alimentation' },
  { id: 'ponte', libelle: 'Enregistrer la ponte', module: 'elevage', tab: 'Pondeuses' },
  { id: 'mortalite', libelle: 'Déclarer une mortalité', module: 'elevage', tab: 'Lots & bandes' },
  { id: 'pesee', libelle: 'Enregistrer une pesée', module: 'elevage', tab: 'Embouche bovine' },
  { id: 'irrigation', libelle: "Noter l'irrigation", module: 'cultures', tab: 'Irrigation' },
  { id: 'recolte', libelle: 'Enregistrer la récolte', module: 'cultures', tab: 'Récoltes' },
  { id: 'vente', libelle: 'Enregistrer une vente', module: 'commercial', tab: 'Ventes' },
];

/** Huit indicateurs maximum sur le Pilotage, tous lus du catalogue central. */
export const CODES_KPI_PILOTAGE = [
  'ca', 'encaissements', 'creances', 'tresorerie',
  'marge_globale', 'valeur_stock', 'ponte', 'produits_sous_seuil',
];

const estRoleTerrain = (user = {}) => ROLES_TERRAIN.has(String(user?.user_metadata?.role || user?.role || '').toLowerCase());
const identifiantUtilisateur = (user = {}) => String(user?.user_metadata?.name || user?.email || '').trim();

export default function AccueilConforme(props) {
  const {
    user = {}, taches = [], alertes = [], businessEvents = [],
    onNavigate, periodLabel = '', initialTab, onTabChange,
  } = props;

  const controlled = Boolean(onTabChange);
  const [internalTab, setInternalTab] = useState(() => resolveDashboardTab(initialTab));
  const tab = controlled ? resolveDashboardTab(initialTab) : internalTab;
  const setTab = useCallback((next) => {
    const resolu = resolveDashboardTab(next);
    if (controlled) onTabChange?.(resolu);
    else setInternalTab(resolu);
  }, [controlled, onTabChange]);
  useEffect(() => {
    if (controlled || !initialTab) return;
    setInternalTab(resolveDashboardTab(initialTab));
  }, [controlled, initialTab]);

  const terrain = estRoleTerrain(user);
  const donnees = useMemo(() => ({
    sales_orders: props.salesOrders,
    payments: props.payments,
    finances: props.transactions,
    stock: props.stocks,
    animaux: props.animaux,
    avicole: props.lotsData || props.lots,
    cultures: props.cultures,
    production_oeufs_logs: props.productionLogs,
    documents: props.documents,
    invoices: props.invoices,
    alertes_center: alertes,
    taches,
    clients: props.clients,
  }), [props, alertes, taches]);
  const kpis = useMemo(() => {
    try {
      return runKpiEngine(donnees, { module: 'dashboard', periodScope: props.periodScope || {} });
    } catch {
      return null;
    }
  }, [donnees, props.periodScope]);

  const tachesUrgentes = useMemo(
    () => filtrerTaches(taches, { statut: 'ouvertes', limite: 6 })
      .filter((t) => ['critique', 'haute', 'critical', 'high'].includes(String(t.priority || '').toLowerCase())
        || (String(t.due_date || '').slice(0, 10) <= new Date().toISOString().slice(0, 10))),
    [taches],
  );
  const stocksSensibles = useMemo(() => (kpis?.stock?.ruptureRows || []).slice(0, 5), [kpis]);
  const codesPilotage = terrain
    ? CODES_KPI_PILOTAGE.filter((code) => ['ponte', 'produits_sous_seuil'].includes(code))
    : CODES_KPI_PILOTAGE;

  const vueDuJour = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListeAlertes alertes={alertes} filtres={{ gravite: 'critique', limite: 6 }} titre="Priorités : alertes critiques" onNavigate={onNavigate} onCreerTache={props.onCreateTask ? (alerte) => props.onCreateTask({ title: `Traiter : ${alerte.title || alerte.id}`, alert_id: alerte.id, module_lie: alerte.module_source, priority: 'critique', status: 'a_faire' }) : undefined} />
        <ListeTaches taches={tachesUrgentes} filtres={{ statut: 'toutes', limite: 6 }} titre="Priorités : tâches urgentes" onOuvrirTache={() => onNavigate?.('activite_suivi')} />
      </div>
      {!terrain ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CarteKPI code="ponte" periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
          <CarteKPI code="ca" periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
          <CarteKPI code="encaissements" periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CarteKPI code="ponte" periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
          <CarteKPI code="produits_sous_seuil" periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
        </div>
      )}
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6b12]">Stocks sensibles</p>
        {stocksSensibles.length === 0 ? (
          <p className="mt-3 text-sm text-[#8a7456]">Rien à afficher pour l'instant. Aucun produit sous seuil.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {stocksSensibles.map((ligne) => (
              <li key={ligne.id}>
                <button type="button" onClick={() => onNavigate?.('achats_stock')} className="text-sm font-bold text-[#2f2415] hover:underline">
                  {ligne.name} {ligne.daysLeft != null ? `· ${ligne.daysLeft} j restants` : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <JournalEvenements evenements={businessEvents} filtres={{ limite: 8 }} titre="Derniers mouvements" onNavigate={onNavigate} />
    </div>
  );

  const pilotage = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {codesPilotage.map((code) => (
        <CarteKPI key={code} code={code} periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
      ))}
    </div>
  );

  const mesActions = (
    <ListeTaches
      taches={taches}
      filtres={{ assigne: identifiantUtilisateur(user), statut: 'ouvertes', limite: 30 }}
      titre="Mes actions"
      onOuvrirTache={() => onNavigate?.('activite_suivi')}
    />
  );

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#9a6b12]">Accueil</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Bonjour {identifiantUtilisateur(user) || 'Horizon Farm'}</h1>
            {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {ACTIONS_RAPIDES_QUOTIDIENNES.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onNavigate?.(action.module, { tab: action.tab })}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800"
              >
                {action.libelle}
              </button>
            ))}
          </div>
        </div>
      </section>
      <ModuleTabsBar moduleId="dashboard" active={tab} onChange={setTab} rolesMasquesPour={terrain ? 'terrain' : null} />
      {tab === 'Pilotage' && !terrain ? pilotage : tab === 'Mes actions' ? mesActions : vueDuJour}
    </div>
  );
}
