import { useState } from 'react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import CarteKPI from '../../components/shared/CarteKPI.jsx';
import JournalEvenements from '../../components/shared/JournalEvenements.jsx';
import ListeAlertes from '../../components/shared/ListeAlertes.jsx';
import ListeTaches from '../../components/shared/ListeTaches.jsx';
import { resolveDashboardTab } from '../../utils/commercialNavigation.js';
import BaseAccueil from '../DashboardV2.jsx';
import AccueilCommercialCard from './AccueilCommercialCard.jsx';

const KPI_LINKS = Object.freeze([
  { code: 'chiffre_affaires', label: 'Chiffre d’affaires', module: 'commercial', sensitive: true },
  { code: 'encaissements', label: 'Encaissements', module: 'commercial', sensitive: true },
  { code: 'creances', label: 'Créances', module: 'commercial', sensitive: true },
  { code: 'tresorerie', label: 'Trésorerie', module: 'finance_pilotage', sensitive: true },
  { code: 'jours_tresorerie', label: 'Jours de trésorerie', module: 'finance_pilotage', sensitive: true },
  { code: 'marge_globale', label: 'Marge globale et par filière', module: 'finance_pilotage', sensitive: true },
  { code: 'valeur_stock', label: 'Valeur de stock', module: 'achats_stock' },
  { code: 'mortalite_ponte', label: 'Mortalité ou ponte', module: 'elevage' },
]);

const OPEN_TASK_STATUSES = ['a_faire', 'en_cours', 'todo', 'pending', 'in_progress'];
const OPEN_ALERT_STATUSES = ['nouvelle', 'ouverte', 'open', 'pending', 'a_traiter'];
const CRITICAL_SEVERITIES = ['urgence', 'critique', 'critical', 'haute', 'warning'];

function Pilotage({ kpiValues = [], kpiCatalog = [], onNavigate, role, farmId, period }) {
  const visible = role === 'terrain' ? KPI_LINKS.filter((item) => !item.sensitive) : KPI_LINKS;
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Pilotage">
      {visible.map((definition) => <CarteKPI key={definition.code} code={definition.code} values={kpiValues} catalog={kpiCatalog} label={definition.label} ownerModule={definition.module} sensitive={definition.sensitive} role={role} farmId={farmId} period={period} onNavigate={onNavigate} />)}
    </section>
  );
}

function MesActions({ tasks = [], userId, farmId, period, onNavigate }) {
  return <ListeTaches title="Mes actions" tasks={userId ? tasks : []} farmId={farmId} assignedTo={userId} statuses={OPEN_TASK_STATUSES} period={period} limit={20} onNavigate={onNavigate} />;
}

export default function AccueilRefinedEntry(props) {
  const [tab, setTab] = useState(() => resolveDashboardTab(props.initialTab));
  const role = props.role || props.user?.user_metadata?.role || null;
  const kpiValues = props.kpiValues || props.dataMap?.kpi_values || [];
  const kpiCatalog = props.kpiCatalog || props.dataMap?.kpi_catalog || [];
  const farmId = props.activeFarm?.id || props.farm?.id || props.ferme?.id;
  const period = props.periodScope;
  return (
    <div className="space-y-3">
      <ModuleTabsBar moduleId="dashboard" active={tab} onChange={setTab} role={role} activeFarm={props.activeFarm} />
      {tab === 'Carnet Horizon' ? (
        <>
          <BaseAccueil {...props} />
          <div className="grid gap-5 lg:grid-cols-2">
            <ListeAlertes title="Alertes critiques" alertes={props.alertes || props.dataMap?.alertes_center || []} farmId={farmId} severities={CRITICAL_SEVERITIES} statuses={OPEN_ALERT_STATUSES} period={period} limit={6} onNavigate={props.onNavigate} />
            <JournalEvenements events={props.businessEvents || props.dataMap?.business_events || []} farmId={farmId} period={period} limit={8} onNavigate={props.onNavigate} compact />
          </div>
          <AccueilCommercialCard onNavigate={props.onNavigate} />
        </>
      ) : null}
      {tab === 'Indicateurs ferme' ? <Pilotage kpiValues={kpiValues} kpiCatalog={kpiCatalog} onNavigate={props.onNavigate} role={role} farmId={farmId} period={props.periodLabel} /> : null}
      {tab === 'Mes actions' ? <MesActions tasks={props.taches || []} userId={props.user?.id} farmId={farmId} period={period} onNavigate={props.onNavigate} /> : null}
    </div>
  );
}
