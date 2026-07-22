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
import { Droplets, Egg, HeartCrack, Scale, ShoppingCart, Utensils, Wheat } from 'lucide-react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import JournalEvenements from '../../components/uniques/JournalEvenements.jsx';
import ListeTaches, { filtrerTaches } from '../../components/uniques/ListeTaches.jsx';
import ListeAlertes from '../../components/uniques/ListeAlertes.jsx';
import DecisionBriefingCard from './DecisionBriefingCard.jsx';
import CarteKPI from '../../components/uniques/CarteKPI.jsx';
import CockpitIndicateursPanel from '../pilotage/CockpitIndicateursPanel.jsx';
import PredictiveAlertsPanel from '../pilotage/PredictiveAlertsPanel.jsx';
import FarmDigestPanel from '../pilotage/FarmDigestPanel.jsx';
import MobileMoneyReconciliationPanel from '../pilotage/MobileMoneyReconciliationPanel.jsx';
import { runKpiEngine } from '../../services/kpiEngine/index.js';
import { resolveDashboardTab } from '../../utils/commercialNavigation.js';
import { SAISIES_QUOTIDIENNES } from '../../config/formulaires20s.config.js';
import { openDailyQuickEntry } from '../../utils/dailyQuickEntry.js';
import { filterRealOpenAlerts, filterRealOpenTasks } from '../../utils/healthFindingLabels.js';

const ROLES_TERRAIN = new Set(['terrain', 'farm_agent', 'employe', 'farm_readonly']);

/**
 * Les 7 saisies quotidiennes : boutons d'action rapide sur l'Accueil, dérivés du
 * registre unique du contrat des 20 secondes. Chaque bouton ouvre le formulaire
 * de son module propriétaire, sur son onglet.
 */
export const ACTIONS_RAPIDES_QUOTIDIENNES = SAISIES_QUOTIDIENNES.map((f) => ({
  id: f.id,
  libelle: f.libelleBouton,
  module: f.module,
  tab: f.onglet,
}));

/** Icône par geste quotidien : repère visuel pour un balayage plus rapide. */
const ICONES_GESTES = {
  distribution: Utensils,
  ponte: Egg,
  mortalite: HeartCrack,
  pesee: Scale,
  irrigation: Droplets,
  recolte: Wheat,
  vente: ShoppingCart,
};

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
    queueMicrotask(() => setInternalTab(resolveDashboardTab(initialTab)));
  }, [controlled, initialTab]);

  const terrain = estRoleTerrain(user);
  const donnees = useMemo(() => ({
    sales_orders: props.salesOrders,
    sales_orders_all: props.salesOrdersAll,
    payments: props.payments,
    payments_all: props.paymentsAll,
    finances: props.transactions,
    finances_all: props.transactionsAll,
    stock: props.stocks,
    animaux: props.animaux,
    avicole: props.lotsData || props.lots,
    cultures: props.cultures,
    production_oeufs_logs: props.productionLogs,
    production_oeufs_logs_all: props.productionLogsAll,
    documents: props.documents,
    invoices: props.invoices,
    invoices_all: props.invoicesAll,
    deliveries: props.deliveries,
    deliveries_all: props.deliveriesAll,
    alertes_center: alertes,
    taches,
    clients: props.clients,
    alimentation_logs: props.alimentationLogs || props.alimentation_logs,
  }), [props, alertes, taches]);
  const kpis = useMemo(() => {
    try {
      return runKpiEngine(donnees, { module: 'dashboard', periodScope: props.periodScope || {} });
    } catch {
      return null;
    }
  }, [donnees, props.periodScope]);
  const tachesOperationnelles = useMemo(() => filterRealOpenTasks(taches), [taches]);
  const alertesOperationnelles = useMemo(() => filterRealOpenAlerts(alertes), [alertes]);

  const tachesUrgentes = useMemo(
    () => filtrerTaches(tachesOperationnelles, { statut: 'ouvertes', limite: 6 })
      .filter((t) => ['critique', 'haute', 'critical', 'high'].includes(String(t.priority || '').toLowerCase())
        || (String(t.due_date || '').slice(0, 10) <= new Date().toISOString().slice(0, 10))),
    [tachesOperationnelles],
  );
  const stocksSensibles = useMemo(() => (kpis?.stock?.ruptureRows || []).slice(0, 5), [kpis]);
  const codesPilotage = terrain
    ? CODES_KPI_PILOTAGE.filter((code) => ['ponte', 'produits_sous_seuil'].includes(code))
    : CODES_KPI_PILOTAGE;

  const vueDuJour = (
    <div className="space-y-4">
      {!terrain ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CarteKPI code="tresorerie" periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
          <CarteKPI code="ponte" periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
          <CarteKPI code="ca" periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
          <CarteKPI code="alertes_urgentes" periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CarteKPI code="effectif_animaux" periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
          <CarteKPI code="ponte" periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
          <CarteKPI code="alertes_urgentes" periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
        </div>
      )}
      <section className="hf-card" data-testid="daily-quick-actions">
        <p className="text-label font-semibold uppercase text-earth">Gestes du jour</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {ACTIONS_RAPIDES_QUOTIDIENNES.map((action) => {
            const Icone = ICONES_GESTES[action.id];
            return (
              <button
                key={action.id}
                type="button"
                data-testid={`daily-action-${action.id}`}
                onClick={() => openDailyQuickEntry(action, onNavigate)}
                className="group flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-control border border-line bg-pure px-3 py-3 text-center text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-leaf hover:bg-positive-bg hover:shadow-card"
              >
                {Icone ? (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-positive-bg text-leaf transition group-hover:bg-white">
                    <Icone size={17} aria-hidden="true" />
                  </span>
                ) : null}
                <span className="leading-tight">{action.libelle}</span>
              </button>
            );
          })}
        </div>
      </section>
      <DecisionBriefingCard
        dataMap={{
          transactions: props.transactions, salesOrders: props.salesOrders, payments: props.payments,
          fournisseurs: props.fournisseurs, stocks: props.stocks, stock: props.stocks,
          animaux: props.animaux, lots: props.lotsData, avicole: props.lotsData,
          cultures: props.cultures, sante: props.vaccins, vaccins: props.vaccins,
          investissements: props.investissements, businessEvents: props.businessEvents,
          clients: props.clients, alertes,
        }}
        onNavigate={onNavigate}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListeAlertes alertes={alertesOperationnelles} filtres={{ gravite: 'critique', limite: 6 }} titre="Priorités : alertes critiques" onNavigate={onNavigate} onCreerTache={props.onCreateTask ? (alerte) => props.onCreateTask({ title: `Traiter : ${alerte.title || alerte.id}`, alert_id: alerte.id, module_lie: alerte.module_source, priority: 'critique', status: 'a_faire' }) : undefined} />
        <ListeTaches taches={tachesUrgentes} filtres={{ statut: 'toutes', limite: 6 }} titre="Priorités : tâches urgentes" onOuvrirTache={() => onNavigate?.('activite_suivi')} />
      </div>
      <section className="hf-card">
        <p className="text-label font-semibold uppercase text-earth">Stocks sensibles</p>
        {stocksSensibles.length === 0 ? (
          <p className="mt-3 text-sm text-slate">Aucun produit sous seuil. Le stock est maîtrisé.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {stocksSensibles.map((ligne) => (
              <li key={ligne.id}>
                <button type="button" onClick={() => onNavigate?.('achats_stock')} className="text-sm font-semibold text-earth hover:underline">
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {codesPilotage.map((code) => (
          <CarteKPI key={code} code={code} periode={periodLabel} donnees={donnees} kpis={kpis} onNavigate={onNavigate} />
        ))}
      </div>
      <CockpitIndicateursPanel data={donnees} />
      <PredictiveAlertsPanel data={donnees} onCreateTask={props.onCreateTask} />
      <MobileMoneyReconciliationPanel data={donnees} />
      <FarmDigestPanel data={donnees} />
    </div>
  );

  const mesActions = (
    <ListeTaches
      taches={tachesOperationnelles}
      filtres={{ assigne: identifiantUtilisateur(user), statut: 'ouvertes', limite: 30 }}
      titre="Mes actions"
      onOuvrirTache={() => onNavigate?.('activite_suivi')}
    />
  );

  return (
    <div className="space-y-4">
      <section className="hf-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-label font-semibold uppercase text-horizon-dark">Accueil</p>
            <h1 className="mt-1 text-ink">Bonjour {identifiantUtilisateur(user) || 'Horizon Farm'}</h1>
            {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          </div>
        </div>
      </section>
      <ModuleTabsBar moduleId="dashboard" active={tab} onChange={setTab} rolesMasquesPour={terrain ? 'terrain' : null} />
      {tab === 'Pilotage' && !terrain ? pilotage : tab === 'Mes actions' ? mesActions : vueDuJour}
    </div>
  );
}
