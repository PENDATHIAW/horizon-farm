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
import ListeTaches from '../../components/uniques/ListeTaches.jsx';
import CarteKPI from '../../components/uniques/CarteKPI.jsx';
import { CATALOGUE_KPI, valeurKpi } from '../../config/catalogueKpi.js';
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

const fmtFcfa = (value) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value) || 0);

const formatKpiValue = (value) => {
  if (value == null || value === '') return '-';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: Number.isInteger(n) ? 0 : 1 }).format(n);
};

const estAlerteUrgente = (a = {}) => ['critique', 'urgence', 'danger', 'critical', 'high'].includes(String(a.severity || a.gravite || '').toLowerCase());

export default function AccueilConforme(props) {
  const {
    user = {}, taches = [], alertes = [],
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

  const stocksSensibles = useMemo(() => (kpis?.stock?.ruptureRows || []).slice(0, 5), [kpis]);
  const codesPilotage = terrain
    ? CODES_KPI_PILOTAGE.filter((code) => ['ponte', 'produits_sous_seuil'].includes(code))
    : CODES_KPI_PILOTAGE;

  const statCodes = !terrain
    ? ['ponte', 'tresorerie', 'ca', 'produits_sous_seuil']
    : ['ponte', 'effectif_animaux', 'alertes_urgentes'];
  const statOf = (code) => {
    const r = valeurKpi(code, donnees, { periodScope: props.periodScope || {}, kpis });
    const entree = r.entree || CATALOGUE_KPI[code] || {};
    const dispo = r.disponible !== false && r.valeur != null;
    return { label: entree.libelle || code, unit: entree.unite || '', value: dispo ? formatKpiValue(r.valeur) : '-', module: entree.proprietaire };
  };
  const treasury = kpis?.finance?.treasuryByAccount;
  const treasuryAccounts = (treasury?.accounts || []).filter((a) => Math.abs(Number(a.net) || 0) > 0);

  // Direction C (focus épuré) : une seule colonne, sans cartes encadrées, des
  // lignes fines et de grands chiffres calmes.
  const vueDuJour = (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-x-10 gap-y-6 border-b border-line pb-8">
        {statCodes.map((code) => {
          const s = statOf(code);
          return (
            <button key={code} type="button" onClick={() => s.module && onNavigate?.(s.module)} className="text-left">
              <p className="text-meta font-semibold uppercase tracking-wide text-slate">{s.label}</p>
              <p className="mt-1.5 text-[1.8rem] font-semibold leading-none text-ink">{s.value}{s.unit ? <span className="ml-1 text-sm font-semibold text-slate">{s.unit}</span> : null}</p>
            </button>
          );
        })}
      </div>

      <section data-testid="daily-quick-actions">
        <p className="mb-3 text-meta font-semibold uppercase tracking-wide text-slate">À faire maintenant</p>
        <div className="flex flex-wrap gap-2">
          {ACTIONS_RAPIDES_QUOTIDIENNES.map((action) => {
            const Icone = ICONES_GESTES[action.id];
            return (
              <button key={action.id} type="button" data-testid={`daily-action-${action.id}`} onClick={() => openDailyQuickEntry(action, onNavigate, { data: donnees, user: identifiantUtilisateur(user) })} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-mist">
                {Icone ? <Icone size={15} aria-hidden="true" className="text-slate" /> : null}
                {action.libelle}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <p className="mb-1 text-meta font-semibold uppercase tracking-wide text-slate">Alertes</p>
        {alertesOperationnelles.length === 0 ? (
          <p className="py-3 text-sm text-slate">Aucune alerte. Tout est calme.</p>
        ) : (
          alertesOperationnelles.slice(0, 6).map((a) => (
            <button key={a.id} type="button" onClick={() => onNavigate?.(a.module_source || a.navModule)} className="flex w-full items-center justify-between gap-3 border-b border-line py-3 text-left last:border-b-0">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{a.title || a.titre || a.id}</span>
                {a.message ? <span className="mt-0.5 block truncate text-meta text-slate">{a.message}</span> : null}
              </span>
              <span className={`shrink-0 text-meta font-semibold ${estAlerteUrgente(a) ? 'text-urgent' : 'text-horizon-dark'}`}>{estAlerteUrgente(a) ? 'Urgent' : 'À voir'}</span>
            </button>
          ))
        )}
      </section>

      {stocksSensibles.length > 0 ? (
        <section>
          <p className="mb-1 text-meta font-semibold uppercase tracking-wide text-slate">Stocks sensibles</p>
          {stocksSensibles.map((ligne) => (
            <button key={ligne.id} type="button" onClick={() => onNavigate?.('achats_stock')} className="flex w-full items-center justify-between border-b border-line py-3 text-left text-sm last:border-b-0">
              <span className="text-ink">{ligne.name}</span>
              {ligne.daysLeft != null ? <span className="text-meta font-semibold text-horizon-dark">{ligne.daysLeft} j restants</span> : null}
            </button>
          ))}
        </section>
      ) : null}

      {treasuryAccounts.length > 0 ? (
        <section>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-meta font-semibold uppercase tracking-wide text-slate">Trésorerie</p>
            <button type="button" onClick={() => onNavigate?.('finance_pilotage')} className="text-meta font-semibold text-slate hover:text-ink">Détail</button>
          </div>
          {treasuryAccounts.map((a) => (
            <div key={a.key} className="flex items-center justify-between border-b border-line py-3 text-sm">
              <span className="text-slate">{a.label}</span>
              <span className="font-semibold tabular-nums text-ink">{fmtFcfa(a.net)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-3 text-sm font-semibold">
            <span className="text-ink">Total disponible</span>
            <span className="tabular-nums text-ink">{fmtFcfa(treasury?.cashNet)} FCFA</span>
          </div>
        </section>
      ) : null}
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
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-meta font-semibold uppercase tracking-wide text-slate">Accueil{periodLabel ? ` · ${periodLabel}` : ''}</p>
        <h1 className="mt-1.5 text-ink">Bonjour {identifiantUtilisateur(user) || 'Horizon Farm'}</h1>
        <p className="mt-1 text-sm text-slate">Voici ce qui compte aujourd'hui pour votre ferme.</p>
      </header>
      <ModuleTabsBar moduleId="dashboard" active={tab} onChange={setTab} rolesMasquesPour={terrain ? 'terrain' : null} />
      {tab === 'Pilotage' && !terrain ? pilotage : tab === 'Mes actions' ? mesActions : vueDuJour}
    </div>
  );
}
