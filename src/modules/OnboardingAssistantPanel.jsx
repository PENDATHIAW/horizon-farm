import { ArrowRight, Check, Compass, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { farmsService } from '../services/farmsService.js';
import { persistModuleFlags } from '../config/moduleFlags.js';
import {
  buildOnboardingSettings,
  getOnboardingProfile,
  isFarmOnboarded,
  listOnboardingProfiles,
  resolveOnboardingFlags,
} from '../config/onboardingProfiles.js';

/**
 * Assistant d'onboarding par filière (HF-P1-009). L'exploitant choisit son
 * activité ; l'assistant règle les modules adaptés et propose les premiers
 * gestes, au lieu de le laisser découvrir seul des dizaines d'écrans.
 */
export default function OnboardingAssistantPanel({ activeFarm = {}, onFarmsChanged, onNavigate }) {
  const onboardedProfileId = activeFarm?.settings?.onboarding?.profile || null;
  const [selected, setSelected] = useState(onboardedProfileId);
  const [busy, setBusy] = useState(false);
  const [reconfigure, setReconfigure] = useState(!isFarmOnboarded(activeFarm));

  const profiles = listOnboardingProfiles();
  const activeProfile = getOnboardingProfile(selected);

  const apply = async () => {
    if (!activeProfile) { toast.error('Choisissez une filière'); return; }
    if (!activeFarm?.id) { toast.error('Ferme active requise'); return; }
    setBusy(true);
    try {
      const settings = buildOnboardingSettings(activeFarm, activeProfile.id);
      await farmsService.updateFarm(activeFarm.id, { settings });
      persistModuleFlags(resolveOnboardingFlags(activeProfile.id));
      await onFarmsChanged?.();
      setReconfigure(false);
      toast.success(`Configuration ${activeProfile.label} appliquée`);
    } catch (error) {
      toast.error(error?.message || 'Configuration impossible');
    } finally {
      setBusy(false);
    }
  };

  // Vue compacte quand la filière est déjà choisie (accès aux premiers gestes).
  if (onboardedProfileId && !reconfigure) {
    const profile = getOnboardingProfile(onboardedProfileId);
    return (
      <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-earth">
            <Compass size={19} aria-hidden="true" /> Filière : {profile?.label || onboardedProfileId}
          </h2>
          <button type="button" onClick={() => { setSelected(onboardedProfileId); setReconfigure(true); }} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-earth hover:bg-card">
            Changer de filière
          </button>
        </div>
        {profile?.firstSteps?.length ? (
          <div>
            <p className="mb-2 text-sm text-slate">Premiers gestes conseillés :</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {profile.firstSteps.map((step) => (
                <button key={step.label} type="button" onClick={() => onNavigate?.(step.module, step.tab ? { tab: step.tab } : undefined)} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-card px-4 py-3 text-left text-sm font-semibold text-earth hover:bg-positive-bg">
                  {step.label}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 font-semibold text-earth">
          <Sparkles size={19} aria-hidden="true" /> Configurer la ferme par filière
        </h2>
        <p className="mt-1 text-sm text-slate">
          Choisissez votre activité : l’assistant active les modules adaptés et vous montre les premiers gestes. Vous pourrez tout ajuster ensuite.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => {
          const active = selected === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => setSelected(profile.id)}
              className={`rounded-2xl border p-4 text-left transition ${active ? 'border-leaf bg-positive-bg' : 'border-line bg-card hover:border-leaf'}`}
            >
              <p className="flex items-center gap-2 font-semibold text-earth">
                {active ? <Check size={16} className="text-leaf" aria-hidden="true" /> : null}
                {profile.label}
              </p>
              <p className="mt-1 text-xs text-slate">{profile.description}</p>
            </button>
          );
        })}
      </div>

      {activeProfile ? (
        <div className="mt-5 rounded-2xl border border-line bg-card p-4">
          <p className="text-sm font-semibold text-earth">Ce qui sera configuré pour « {activeProfile.label} »</p>
          <ul className="mt-2 space-y-1 text-sm text-slate">
            {activeProfile.firstSteps.map((step) => (
              <li key={step.label} className="flex items-center gap-2"><ArrowRight size={13} aria-hidden="true" /> {step.label}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={apply} className="inline-flex items-center gap-2 rounded-lg bg-leaf px-4 py-2 text-sm font-semibold text-earth disabled:opacity-50">
              {busy ? 'Application...' : 'Appliquer cette configuration'}
            </button>
            {onboardedProfileId ? (
              <button type="button" disabled={busy} onClick={() => setReconfigure(false)} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-earth">
                Annuler
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
