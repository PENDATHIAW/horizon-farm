import { AlertTriangle, CheckCircle2, ListChecks, Receipt, TrendingUp, Wrench } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { deriveSalesOpportunities, salesOpportunityAmount } from '../utils/salesOpportunityDerivation';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim().toLowerCase();
const doneStatuses = ['termine', 'terminé', 'done', 'closed', 'annule', 'annulé', 'convertie', 'traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'archive', 'archivée', 'supprime', 'supprimé'];

function isTaskOpen(row = {}) {
  const status = clean(row.status || row.statut || 'a_faire');
  return !doneStatuses.includes(status);
}
function isAlertOpen(row = {}) {
  const status = clean(row.status || row.statut || 'nouvelle');
  return !doneStatuses.includes(status);
}
function equipmentRisk(row = {}) {
  return ['panne', 'maintenance', 'hors_service', 'a_reparer'].includes(clean(row.status || row.statut));
}

export default function DashboardOperationsBridge({ opportunities = [], lots = [], animaux = [], cultures = [], stocks = [], taches = [], alertes = [], equipements = [], businessEvents = [], onNavigate }) {
  const openOpportunities = deriveSalesOpportunities({ opportunities, lots, animaux, cultures, stocks });
  const openTasks = arr(taches).filter(isTaskOpen);
  const openAlerts = arr(alertes).filter(isAlertOpen);
  const equipmentAlerts = arr(equipements).filter(equipmentRisk);
  const recentEvents = arr(businessEvents).slice().sort((a, b) => String(b.created_at || b.event_date || '').localeCompare(String(a.created_at || a.event_date || ''))).slice(0, 5);
  const opportunityValue = openOpportunities.reduce((sum, row) => sum + salesOpportunityAmount(row), 0);
  const criticalTasks = openTasks.filter((row) => ['critique', 'haute'].includes(clean(row.priority || row.priorite))).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <QuickCard icon={Receipt} label="Opportunités" value={openOpportunities.length} detail={fmtCurrency(opportunityValue)} module="ventes" onNavigate={onNavigate} tone="emerald" />
        <QuickCard icon={ListChecks} label="Tâches ouvertes" value={openTasks.length} detail={`${criticalTasks} prioritaires`} module="taches" onNavigate={onNavigate} tone={criticalTasks ? 'amber' : 'neutral'} />
        <QuickCard icon={AlertTriangle} label="Alertes" value={openAlerts.length} detail="à traiter" module="alertes" onNavigate={onNavigate} tone={openAlerts.length ? 'red' : 'emerald'} />
        <QuickCard icon={Wrench} label="Maintenance" value={equipmentAlerts.length} detail="équipements" module="equipements" onNavigate={onNavigate} tone={equipmentAlerts.length ? 'amber' : 'emerald'} />
        <QuickCard icon={TrendingUp} label="Actions tracées" value={recentEvents.length} detail="récentes" module="tracabilite" onNavigate={onNavigate} tone="neutral" />
      </div>

      {recentEvents.length ? (
        <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-[#2f2415]">Dernières actions ERP</p>
            <button type="button" onClick={() => onNavigate?.('tracabilite')} className="text-xs font-bold text-[#9a6b12]">Voir trace</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
            {recentEvents.map((event) => (
              <button key={event.id || `${event.title}-${event.event_date}`} type="button" onClick={() => onNavigate?.('tracabilite')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-left">
                <p className="text-sm font-bold text-[#2f2415] truncate"><CheckCircle2 size={13} className="inline text-emerald-600" /> {event.title || event.event_type || 'Action'}</p>
                <p className="text-xs text-[#8a7456] mt-1 truncate">{event.module_source || event.entity_type || 'ERP'} · {event.event_date || ''}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QuickCard({ icon: Icon, label, value, detail, module, tone = 'neutral', onNavigate }) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    neutral: 'border-[#d6c3a0] bg-white text-[#8a7456]',
  };
  return (
    <button type="button" onClick={() => onNavigate?.(module)} className={`rounded-2xl border p-4 text-left hover:border-[#b6975f] ${tones[tone] || tones.neutral}`}>
      <Icon size={18} />
      <p className="text-xs mt-2">{label}</p>
      <p className="text-2xl font-black text-[#2f2415]">{fmtNumber(value)}</p>
      <p className="text-xs mt-1">{detail}</p>
    </button>
  );
}
