import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Building2, Edit3, Plus, Star, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatFarmActivitiesLabel } from '../../config/farmAdaptation.js';
import { buildAllFarmsDashboardContext } from '../../utils/farmConsolidation.js';
import {
  FarmComparisonTable,
  FarmDemoModeBanner,
  FarmLocationGrid,
} from '../dashboard/farmDashboardPanels.jsx';
import {
  isFarmDemoModeEnabled,
  setFarmDemoModeEnabled,
} from '../../utils/farmDemoMode.js';
import {
  buildFarmRecordFromCreationDraft,
  buildFarmUpdateFromDraft,
  cloneFarmCreationDraft,
  EMPTY_FARM_CREATION_DRAFT,
} from '../../config/farmCreationModel.js';
import { canManageFarms, farmsService } from '../../services/farmsService.js';
import { DEFAULT_FARM_ID } from '../../utils/farmScope.js';
import FarmCreationWizard from './FarmCreationWizard.jsx';

function StatusPill({ status = 'active' }) {
  const tone = status === 'active' ? 'border-positive bg-positive-bg text-positive'
    : status === 'paused' ? 'border-vigilance bg-vigilance-bg text-horizon-dark'
      : 'border-line bg-neutral-bg text-neutral';
  const label = status === 'active' ? 'Active' : status === 'paused' ? 'En pause' : 'Archivée';
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function farmToDraft(farm = {}) {
  const settings = farm.settings || {};
  return cloneFarmCreationDraft({
    general: {
      name: farm.name || '',
      legal_name: farm.legal_name || '',
      legal_entity_type: farm.legal_entity_type || '',
      registration_number: farm.registration_number || '',
      manager_name: settings.manager_name || '',
      phone: settings.phone || '',
      email: settings.email || '',
      description: settings.description || '',
      status: farm.status || 'active',
      start_date: settings.start_date || '',
    },
    location: settings.location_details || {
      country: farm.country || 'SN',
      region: farm.region || '',
      commune: farm.location || '',
      address: farm.location || '',
      latitude: farm.latitude,
      longitude: farm.longitude,
    },
    activities: { activity_type: farm.activity_type || [] },
    capacities: settings.capacities || EMPTY_FARM_CREATION_DRAFT.capacities,
    finance: settings.finance_settings || EMPTY_FARM_CREATION_DRAFT.finance,
    commercial: settings.commercial_settings || EMPTY_FARM_CREATION_DRAFT.commercial,
    users: settings.users || EMPTY_FARM_CREATION_DRAFT.users,
  });
}

export default function FarmsManagementPanel({
  user = null,
  companyId = null,
  accessibleFarms = [],
  onFarmsChanged,
  initialAction = null,
  farmComparisonData = null,
  onNavigate,
}) {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(() => initialAction === 'create');
  const [editFarm, setEditFarm] = useState(null);
  const [demoModeEnabled, setDemoModeEnabled] = useState(() => isFarmDemoModeEnabled());
  const canManage = canManageFarms(user);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await farmsService.loadAllFarms(user?.id, { includeArchived: canManage });
        if (cancelled) return;
        setFarms(list);
        onFarmsChanged?.(list.filter((farm) => farm.status !== 'archived'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, canManage, onFarmsChanged]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await farmsService.loadAllFarms(user?.id, { includeArchived: canManage });
      setFarms(list);
      onFarmsChanged?.(list.filter((farm) => farm.status !== 'archived'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, canManage, onFarmsChanged]);

  const activeFarms = useMemo(
    () => farms.filter((farm) => farm.status !== 'archived'),
    [farms],
  );
  const monoFarm = activeFarms.length <= 1;
  const comparisonContext = useMemo(() => {
    if (!farmComparisonData || activeFarms.length <= 1) return null;
    return buildAllFarmsDashboardContext(activeFarms, {
      ...farmComparisonData,
      accessibleFarms: activeFarms,
    });
  }, [farmComparisonData, activeFarms]);

  const handleArchive = async (farm) => {
    if (farm.id === DEFAULT_FARM_ID) {
      toast.error('Horizon Farm ne peut pas être archivée.');
      return;
    }
    if (!window.confirm(`Archiver la ferme « ${farm.name} » ?`)) return;
    try {
      await farmsService.archiveFarm(farm.id);
      toast.success('Ferme archivée.');
      await refresh();
    } catch (error) {
      toast.error(error.message || 'Erreur archivage');
    }
  };

  const handleSetDefault = async (farm) => {
    try {
      await farmsService.setDefaultFarm(farm.id, companyId);
      toast.success(`${farm.name} est maintenant la ferme par défaut.`);
      await refresh();
    } catch (error) {
      toast.error(error.message || 'Erreur');
    }
  };

  const handleWizardComplete = async (draft, mode = 'create') => {
    try {
      if (mode === 'edit' && editFarm?.id) {
        const payload = buildFarmUpdateFromDraft(draft);
        await farmsService.updateFarm(editFarm.id, payload);
        await farmsService.saveUserFarmAccess(editFarm.id, draft.users?.assignments || [], user?.id);
        toast.success('Ferme mise à jour.');
      } else {
        const record = buildFarmRecordFromCreationDraft(draft, companyId, user?.id);
        const { farm } = await farmsService.createFarm(record, user?.id, companyId);
        await farmsService.saveUserFarmAccess(farm.id, draft.users?.assignments || [], user?.id);
        toast.success(`Ferme « ${farm.name} » créée.`);
      }
      setWizardOpen(false);
      setEditFarm(null);
      await refresh();
    } catch (error) {
      toast.error(error.message || 'Erreur enregistrement');
    }
  };

  return (
    <div className="space-y-6">
      <FarmDemoModeBanner
        enabled={demoModeEnabled}
        onToggle={() => {
          setFarmDemoModeEnabled(false);
          setDemoModeEnabled(false);
          window.location.reload();
        }}
      />
      {!demoModeEnabled && monoFarm && canManage ? (
        <div className="rounded-2xl border border-line bg-neutral-bg px-4 py-3 text-sm text-neutral flex flex-wrap items-center justify-between gap-2">
          <span>Activer le mode démo multi-fermes pour présenter consolidation et comparaison sans modifier vos données réelles.</span>
          <button
            type="button"
            onClick={() => {
              setFarmDemoModeEnabled(true);
              setDemoModeEnabled(true);
              window.location.reload();
            }}
            className="rounded-lg border border-line bg-white px-3 py-1 text-xs font-semibold"
          >
            Activer démo
          </button>
        </div>
      ) : null}
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">Multi-Fermes</p>
            <h2 className="mt-1 text-xl font-semibold text-earth">Gestion des fermes</h2>
            <p className="mt-1 text-sm text-slate">
              {monoFarm
                ? 'Horizon Farm est votre ferme par défaut.'
                : `${activeFarms.length} ferme(s) accessible(s).`}
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={() => { setEditFarm(null); setWizardOpen(true); }}
              className="inline-flex items-center gap-2 rounded-2xl bg-leaf px-4 py-3 text-sm font-semibold text-earth"
            >
              <Plus size={16} />
              Ajouter une ferme
            </button>
          ) : null}
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-line bg-card p-6 text-sm text-slate">Chargement des fermes…</div>
      ) : (
        <div className="space-y-3">
          {farms.map((farm) => (
            <article key={farm.id} className="rounded-3xl border border-line bg-white p-6 shadow-card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 size={18} className="text-horizon-dark" />
                    <h3 className="text-lg font-semibold text-earth">{farm.name}</h3>
                    {farm.is_default ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-vigilance bg-vigilance-bg px-2 py-1 text-meta font-semibold text-horizon-dark">
                        <Star size={10} />
                        Défaut
                      </span>
                    ) : null}
                    <StatusPill status={farm.status} />
                  </div>
                  <p className="text-sm text-slate">
                    {formatFarmActivitiesLabel(farm.activity_type)}
                  </p>
                  <div className="grid grid-cols-1 gap-2 text-sm text-slate md:grid-cols-3">
                    <p><b className="text-earth">Localisation :</b> {[farm.region, farm.location, farm.country].filter(Boolean).join(', ') || '—'}</p>
                    <p><b className="text-earth">Responsable :</b> {farm.settings?.manager_name || '—'}</p>
                    <p><b className="text-earth">Statut :</b> {farm.status}</p>
                  </div>
                </div>
                {canManage && farm.status !== 'archived' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditFarm(farm); setWizardOpen(true); }}
                      className="inline-flex items-center gap-1 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-earth"
                    >
                      <Edit3 size={14} />
                      Modifier
                    </button>
                    {!farm.is_default ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(farm)}
                        className="inline-flex items-center gap-1 rounded-xl border border-positive px-3 py-2 text-xs font-semibold text-positive"
                      >
                        <Star size={14} />
                        Définir par défaut
                      </button>
                    ) : null}
                    {farm.id !== DEFAULT_FARM_ID ? (
                      <button
                        type="button"
                        onClick={() => handleArchive(farm)}
                        className="inline-flex items-center gap-1 rounded-xl border border-urgent px-3 py-2 text-xs font-semibold text-urgent"
                      >
                        <Archive size={14} />
                        Archiver
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {comparisonContext ? (
        <>
          <section className="rounded-3xl border border-leaf/30 bg-positive-bg p-6 shadow-card">
            <p className="text-meta font-semibold uppercase tracking-normal text-positive">Comparaison multi-fermes</p>
            <h2 className="mt-1 text-lg font-semibold text-earth">Performance par ferme</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {comparisonContext.bestFarm ? (
                <div className="rounded-2xl border border-positive bg-positive-bg p-4">
                  <p className="text-xs font-semibold uppercase text-positive">Meilleure ferme</p>
                  <p className="mt-1 font-semibold text-earth">{comparisonContext.bestFarm.name}</p>
                </div>
              ) : null}
              {comparisonContext.riskiestFarm ? (
                <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4">
                  <p className="text-xs font-semibold uppercase text-horizon-dark">Plus à risque</p>
                  <p className="mt-1 font-semibold text-earth">{comparisonContext.riskiestFarm.name}</p>
                </div>
              ) : null}
              {comparisonContext.mostAlertsFarm ? (
                <div className="rounded-2xl border border-urgent bg-urgent-bg p-4">
                  <p className="text-xs font-semibold uppercase text-urgent">Plus d&apos;alertes</p>
                  <p className="mt-1 font-semibold text-earth">{comparisonContext.mostAlertsFarm.name}</p>
                </div>
              ) : null}
              {comparisonContext.launchingFarms?.length ? (
                <div className="rounded-2xl border border-line bg-neutral-bg p-4">
                  <p className="text-xs font-semibold uppercase text-neutral">En lancement</p>
                  <p className="mt-1 font-semibold text-earth">{comparisonContext.launchingFarms.map((farm) => farm.name).join(', ')}</p>
                </div>
              ) : null}
            </div>
            <FarmComparisonTable rows={comparisonContext.comparisonRows} onNavigate={onNavigate} className="mt-4" />
          </section>
          <FarmLocationGrid cards={comparisonContext.locationCards} onNavigate={onNavigate} />
        </>
      ) : null}

      {!canManage ? (
        <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4 text-sm text-horizon-dark">
          <Users size={14} className="inline mr-1" />
          Vous consultez les fermes en lecture seule. Seuls les rôles direction/admin peuvent créer ou modifier une ferme.
        </div>
      ) : null}

      {wizardOpen ? (
        <FarmCreationWizard
          initialDraft={editFarm ? farmToDraft(editFarm) : cloneFarmCreationDraft()}
          mode={editFarm ? 'edit' : 'create'}
          farmName={editFarm?.name}
          user={user}
          profiles={accessibleFarms}
          onClose={() => { setWizardOpen(false); setEditFarm(null); }}
          onComplete={handleWizardComplete}
        />
      ) : null}
    </div>
  );
}
