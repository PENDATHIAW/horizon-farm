import { useMemo, useState } from 'react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
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

function Pilotage({ kpiValues = [], onNavigate, role }) {
  const byCode = useMemo(() => new Map(kpiValues.map((item) => [item.code, item])), [kpiValues]);
  const visible = role === 'terrain' ? KPI_LINKS.filter((item) => !item.sensitive) : KPI_LINKS;
  return (
    <section className="space-y-3" aria-label="Pilotage">
      {visible.map((definition) => {
        const item = byCode.get(definition.code) || {};
        return (
          <button
            key={definition.code}
            type="button"
            onClick={() => onNavigate?.(definition.module)}
            className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-[#eadcc2] px-1 py-3 text-left"
          >
            <span>
              <strong className="block text-sm text-[#2f2415]">{definition.label}</strong>
              <span className="text-xs text-[#8a7456]">{item.period || 'Période active'} · {item.source || definition.module}</span>
            </span>
            <span className="text-right font-black text-[#2f2415]">{item.value ?? 'Non disponible'} {item.unit || ''}</span>
          </button>
        );
      })}
    </section>
  );
}

function MesActions({ tasks = [], userId }) {
  const assigned = tasks.filter((task) => {
    const assignee = task.assigned_to || task.assignedTo || task.user_id;
    return userId ? String(assignee || '') === String(userId) : true;
  });
  return (
    <section className="space-y-2" aria-label="Mes actions">
      {assigned.length ? assigned.slice(0, 20).map((task) => (
        <div key={task.id} className="border-b border-[#eadcc2] px-1 py-3">
          <strong className="text-sm text-[#2f2415]">{task.title || task.titre || task.description}</strong>
          <p className="mt-1 text-xs text-[#8a7456]">{task.due_date || task.date_echeance || 'Sans échéance'} · {task.priority || task.priorite || 'normale'}</p>
        </div>
      )) : <p className="py-8 text-center text-sm text-[#8a7456]">Rien à afficher pour l’instant.</p>}
    </section>
  );
}

export default function AccueilRefinedEntry(props) {
  const [tab, setTab] = useState(() => resolveDashboardTab(props.initialTab));
  const role = props.role || props.user?.user_metadata?.role || null;
  const kpiValues = props.kpiValues || props.dataMap?.kpi_values || [];
  return (
    <div className="space-y-3">
      <ModuleTabsBar moduleId="dashboard" active={tab} onChange={setTab} role={role} activeFarm={props.activeFarm} />
      {tab === 'Carnet Horizon' ? (
        <>
          <BaseAccueil {...props} />
          <AccueilCommercialCard onNavigate={props.onNavigate} />
        </>
      ) : null}
      {tab === 'Indicateurs ferme' ? <Pilotage kpiValues={kpiValues} onNavigate={props.onNavigate} role={role} /> : null}
      {tab === 'Mes actions' ? <MesActions tasks={props.taches || []} userId={props.user?.id} /> : null}
    </div>
  );
}
