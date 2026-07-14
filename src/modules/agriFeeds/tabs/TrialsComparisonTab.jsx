import { useMemo, useState } from 'react';
import { TRIAL_DECISIONS } from '../../../config/agriFeeds.config.js';
import {
  prepareTrial,
  commitTrial,
  prepareCloseTrial,
  commitCloseTrial,
  prepareHumanValidation,
  commitHumanValidation,
  proposeTrialDecision,
} from '../../../services/agriFeeds/feedTrialWorkflow.js';
import { compareMarketFeedToAgriFeedsFormula } from '../../../services/agriFeeds/phase1FeedBenchmarkEngine.js';
import { fmtCurrency, fmtNumber, toNumber } from '../../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const norm = (v = '') => String(v || '').toLowerCase();

const RESULT_STYLES = {
  favorable: 'text-positive bg-positive-bg border-positive',
  moins_performant: 'text-urgent bg-urgent-bg border-urgent',
  equivalent: 'text-earth bg-white border-line',
  donnees_insuffisantes: 'text-slate bg-card border-line',
};

const STATUS_LABEL = {
  planned: 'Planifié',
  in_progress: 'En cours',
  closed: 'Clôturé',
  cancelled: 'Annulé',
};

const DECISION_LABEL = Object.fromEntries(TRIAL_DECISIONS.map((d) => [d.value, d.label]));

export default function TrialsComparisonTab({
  dataMap = {},
  onCreateFeedTrial,
  onUpdateFeedTrial,
  onCreateFeedPhase1Comparison,
  onUpdateFeedPhase1Comparison,
  onCreateBusinessEvent,
  onCreateAlert,
}) {
  const formulas = arr(dataMap.feed_formulas);
  const versions = arr(dataMap.feed_formula_versions);
  const lots = arr(dataMap.avicole || dataMap.lots);
  const finished = arr(dataMap.feed_finished_batches);
  const trials = arr(dataMap.feed_trials);
  const comparisons = arr(dataMap.feed_phase1_comparisons);

  const [openForm, setOpenForm] = useState({
    formula_version_id: '',
    animal_lot_id: '',
    finished_batch_id: '',
    start_date: new Date().toISOString().slice(0, 10),
    starting_count: '',
    starting_weight_avg: '',
    notes: '',
  });
  const [closeForm, setCloseForm] = useState({
    trial_id: '',
    end_date: new Date().toISOString().slice(0, 10),
    ending_count: '',
    ending_weight_avg: '',
    total_feed_consumed: '',
    total_feed_cost: '',
    mortality_count: '',
    egg_production_total: '',
    revenue: '',
  });
  const [validationForm, setValidationForm] = useState({
    trial_id: '',
    decision: '',
    reviewed_by: '',
    decision_notes: '',
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const versionOptions = useMemo(() => versions
    .map((v) => {
      const f = formulas.find((x) => String(x.id) === String(v.formula_id));
      return { ...v, label: `${f?.name || 'Formule'} · ${v.version_code || v.id}`, formulaStatus: f?.status || '' };
    })
    .filter((v) => !['abandoned', 'suspended'].includes(norm(v.formulaStatus)))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))),
  [versions, formulas]);

  const openTrials = trials
    .filter((t) => ['planned', 'in_progress'].includes(norm(t.status)))
    .sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || '')));
  const closedTrials = trials
    .filter((t) => norm(t.status) === 'closed')
    .sort((a, b) => String(b.end_date || '').localeCompare(String(a.end_date || '')));
  const awaitingHuman = closedTrials.filter((t) => !t.reviewed_by_human);

  const livePreview = useMemo(() => {
    if (!openForm.formula_version_id || !openForm.animal_lot_id) return null;
    return compareMarketFeedToAgriFeedsFormula({
      dataMap,
      animalLotId: openForm.animal_lot_id,
      formulaVersionId: openForm.formula_version_id,
    });
  }, [openForm.formula_version_id, openForm.animal_lot_id, dataMap]);

  const openTrial = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const preview = prepareTrial(openForm, dataMap);
      if (!preview.ok) {
        setMessage(preview.error);
        return;
      }
      await commitTrial(preview, {
        onCreateTrial: onCreateFeedTrial,
        onCreateBusinessEvent,
      });
      setOpenForm((p) => ({
        ...p, notes: '', starting_count: '', starting_weight_avg: '',
      }));
      setMessage(`Essai ouvert : ${preview.trial.trial_code}`);
    } catch (err) {
      setMessage(err?.message || 'Ouverture essai impossible.');
    } finally {
      setBusy(false);
    }
  };

  const closeTrial = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const preview = prepareCloseTrial({
        ...closeForm,
        ending_count: toNumber(closeForm.ending_count),
        ending_weight_avg: toNumber(closeForm.ending_weight_avg),
        total_feed_consumed: toNumber(closeForm.total_feed_consumed),
        total_feed_cost: toNumber(closeForm.total_feed_cost),
        mortality_count: toNumber(closeForm.mortality_count),
        egg_production_total: toNumber(closeForm.egg_production_total),
        revenue: toNumber(closeForm.revenue),
      }, dataMap);
      if (!preview.ok) {
        setMessage(preview.error);
        return;
      }
      await commitCloseTrial(preview, {
        onUpdateTrial: onUpdateFeedTrial,
        onCreateComparison: onCreateFeedPhase1Comparison,
        onCreateBusinessEvent,
        onCreateAlert,
      });
      setValidationForm({
        trial_id: preview.trial.id,
        decision: preview.proposal.value,
        reviewed_by: '',
        decision_notes: preview.proposal.reasons.join(' · '),
      });
      setMessage(
        `Essai clôturé · suggestion : ${preview.proposal.label} (${preview.proposal.confidence}).`
        + ` Comparaison : ${preview.comparison?.message || 'données limitées'}. Confirmation requise.`,
      );
      setCloseForm((p) => ({
        ...p,
        trial_id: '',
        ending_count: '',
        ending_weight_avg: '',
        total_feed_consumed: '',
        total_feed_cost: '',
        mortality_count: '',
        egg_production_total: '',
        revenue: '',
      }));
    } catch (err) {
      setMessage(err?.message || 'Clôture essai impossible.');
    } finally {
      setBusy(false);
    }
  };

  const validateTrial = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const preview = prepareHumanValidation(validationForm, dataMap);
      if (!preview.ok) {
        setMessage(preview.error);
        return;
      }
      await commitHumanValidation(preview, {
        onUpdateTrial: onUpdateFeedTrial,
        onUpdateComparison: onUpdateFeedPhase1Comparison,
        onCreateBusinessEvent,
      });
      setMessage(`Confirmation enregistrée - décision ${DECISION_LABEL[validationForm.decision] || validationForm.decision}.`);
      setValidationForm({ trial_id: '', decision: '', reviewed_by: '', decision_notes: '' });
    } catch (err) {
      setMessage(err?.message || 'Validation impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-line bg-white p-6 space-y-2">
        <p className="text-lg font-semibold text-earth">Tests & comparaison</p>
        <p className="text-sm text-slate leading-relaxed max-w-3xl">
          Essais internes sur animaux Horizon Farm, comparaison formalisée avec la référence
          Phase 1, et confirmation explicite. Une décision est suggérée ; la décision
          finale reste à l’exploitant.
        </p>
        {message ? (
          <p className="text-sm rounded-xl border border-line bg-card px-3 py-2">{message}</p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <form onSubmit={openTrial} className="rounded-3xl border border-line bg-white p-6 space-y-3">
          <p className="font-semibold text-earth">Ouvrir un essai</p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Version de formule</span>
            <select
              value={openForm.formula_version_id}
              onChange={(e) => setOpenForm((p) => ({ ...p, formula_version_id: e.target.value }))}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              required
            >
              <option value="">Choisir…</option>
              {versionOptions.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Lot / animal cible</span>
              <select
                value={openForm.animal_lot_id}
                onChange={(e) => setOpenForm((p) => ({ ...p, animal_lot_id: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
                required
              >
                <option value="">Choisir…</option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nom || l.name || l.id} ({l.type || '-'})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Lot fini utilisé (optionnel)</span>
              <select
                value={openForm.finished_batch_id}
                onChange={(e) => setOpenForm((p) => ({ ...p, finished_batch_id: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              >
                <option value="">-</option>
                {finished.map((b) => (
                  <option key={b.id} value={b.id}>{b.batch_code} · {b.quality_status}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Date début</span>
              <input
                type="date"
                value={openForm.start_date}
                onChange={(e) => setOpenForm((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Effectif initial</span>
              <input
                type="number"
                min="0"
                value={openForm.starting_count}
                onChange={(e) => setOpenForm((p) => ({ ...p, starting_count: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Poids moyen initial</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openForm.starting_weight_avg}
                onChange={(e) => setOpenForm((p) => ({ ...p, starting_weight_avg: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Notes</span>
            <textarea
              value={openForm.notes}
              onChange={(e) => setOpenForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full min-h-[72px] rounded-xl border border-line px-3 py-2 text-sm"
            />
          </label>
          {livePreview?.market ? (
            <div className="rounded-2xl border border-line bg-card p-3 text-xs text-earth">
              <p className="font-semibold">Référence Phase 1 disponible pour ce lot :</p>
              <p>{livePreview.market.feed_type} - {fmtNumber(livePreview.market.quantity_consumed)} kg · {fmtCurrency(livePreview.market.price_per_kg)}/kg</p>
              <p>Mortalité {livePreview.market.mortality_rate?.toFixed?.(1) || '-'} % · Coût / sujet {fmtCurrency(livePreview.market.cost_feed_per_subject)}</p>
            </div>
          ) : (
            <p className="text-xs text-slate">Aucune référence Phase 1 pour ce lot - la comparaison sera partielle.</p>
          )}
          <button
            type="submit"
            disabled={busy || !versionOptions.length || !lots.length}
            className="min-h-[44px] rounded-xl bg-earth px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Ouvrir l’essai
          </button>
        </form>

        <form onSubmit={closeTrial} className="rounded-3xl border border-line bg-white p-6 space-y-3">
          <p className="font-semibold text-earth">Clôturer un essai</p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Essai en cours</span>
            <select
              value={closeForm.trial_id}
              onChange={(e) => {
                const trial_id = e.target.value;
                const tr = trials.find((t) => String(t.id) === trial_id);
                setCloseForm((p) => ({
                  ...p,
                  trial_id,
                  ending_count: tr?.starting_count ? String(tr.starting_count) : p.ending_count,
                }));
              }}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              required
            >
              <option value="">Choisir…</option>
              {openTrials.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.trial_code} · {t.animal_lot_id} · {STATUS_LABEL[t.status] || t.status}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Date fin</span>
              <input
                type="date"
                value={closeForm.end_date}
                onChange={(e) => setCloseForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Effectif final</span>
              <input
                type="number"
                min="0"
                value={closeForm.ending_count}
                onChange={(e) => setCloseForm((p) => ({ ...p, ending_count: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Mortalité (unités)</span>
              <input
                type="number"
                min="0"
                value={closeForm.mortality_count}
                onChange={(e) => setCloseForm((p) => ({ ...p, mortality_count: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Poids moyen final</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={closeForm.ending_weight_avg}
                onChange={(e) => setCloseForm((p) => ({ ...p, ending_weight_avg: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Aliment consommé (kg)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={closeForm.total_feed_consumed}
                onChange={(e) => setCloseForm((p) => ({ ...p, total_feed_consumed: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Coût aliment (FCFA)</span>
              <input
                type="number"
                min="0"
                value={closeForm.total_feed_cost}
                onChange={(e) => setCloseForm((p) => ({ ...p, total_feed_cost: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Œufs produits (si pondeuse)</span>
              <input
                type="number"
                min="0"
                value={closeForm.egg_production_total}
                onChange={(e) => setCloseForm((p) => ({ ...p, egg_production_total: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">CA / revenu essai</span>
              <input
                type="number"
                min="0"
                value={closeForm.revenue}
                onChange={(e) => setCloseForm((p) => ({ ...p, revenue: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy || !openTrials.length}
            className="min-h-[44px] rounded-xl bg-earth px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Clôturer → KPI + comparaison + décision proposée
          </button>
        </form>
      </div>

      {awaitingHuman.length ? (
        <section className="rounded-3xl border border-vigilance bg-vigilance-bg p-6 space-y-3">
          <p className="font-semibold text-horizon-dark">Confirmation requise ({awaitingHuman.length})</p>
          {awaitingHuman.map((t) => {
            const comp = comparisons.find((c) => String(c.trial_id) === String(t.id));
            const proposal = proposeTrialDecision({ trial: t, comparison: comp ? { status: comp.overall_status, comparison: comp.metrics } : null });
            return (
              <div key={t.id} className="rounded-2xl border border-vigilance bg-white p-3 space-y-1">
                <p className="text-sm font-semibold text-earth">
                  {t.trial_code} - {t.animal_lot_id}
                </p>
                <p className="text-xs text-slate">
                  Suggestion : <b>{proposal.label}</b> ({proposal.confidence}) · {proposal.reasons.join(' · ')}
                </p>
                <button
                  type="button"
                  onClick={() => setValidationForm({
                    trial_id: t.id,
                    decision: proposal.value,
                    reviewed_by: '',
                    decision_notes: proposal.reasons.join(' · '),
                  })}
                  className="text-xs font-semibold text-earth underline"
                >
                  Renseigner la confirmation
                </button>
              </div>
            );
          })}
        </section>
      ) : null}

      <form onSubmit={validateTrial} className="rounded-3xl border border-line bg-white p-6 space-y-3">
        <p className="font-semibold text-earth">Confirmation</p>
        <p className="text-xs text-slate leading-relaxed max-w-2xl">
          Une décision est suggérée à partir des indicateurs et de la comparaison Phase 1.
          Vous devez la confirmer, la corriger et signer.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Essai clôturé</span>
            <select
              value={validationForm.trial_id}
              onChange={(e) => setValidationForm((p) => ({ ...p, trial_id: e.target.value }))}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              required
            >
              <option value="">Choisir…</option>
              {closedTrials.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.trial_code} {t.reviewed_by_human ? '· déjà validé' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Décision humaine</span>
            <select
              value={validationForm.decision}
              onChange={(e) => setValidationForm((p) => ({ ...p, decision: e.target.value }))}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              required
            >
              <option value="">Choisir…</option>
              {TRIAL_DECISIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Nom du validateur</span>
            <input
              value={validationForm.reviewed_by}
              onChange={(e) => setValidationForm((p) => ({ ...p, reviewed_by: e.target.value }))}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Justification</span>
            <input
              value={validationForm.decision_notes}
              onChange={(e) => setValidationForm((p) => ({ ...p, decision_notes: e.target.value }))}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy || !closedTrials.length}
          className="min-h-[44px] rounded-xl bg-earth px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          Enregistrer la confirmation
        </button>
      </form>

      <section className="rounded-3xl border border-line bg-white p-6 space-y-3">
        <p className="font-semibold text-earth">Essais ({trials.length})</p>
        {trials.length ? (
          <div className="space-y-2">
            {trials
              .slice()
              .sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || '')))
              .map((t) => {
                const comp = comparisons.find((c) => String(c.trial_id) === String(t.id));
                const style = RESULT_STYLES[comp?.overall_status] || RESULT_STYLES.donnees_insuffisantes;
                return (
                  <article key={t.id} className={`rounded-2xl border p-3 text-sm ${style}`}>
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-semibold">{t.trial_code} · {t.animal_lot_id}</p>
                      <p className="text-xs">{STATUS_LABEL[t.status] || t.status}</p>
                    </div>
                    <p className="text-xs">
                      IC {t.feed_conversion_ratio ? Number(t.feed_conversion_ratio).toFixed(2) : '-'} · Mort. {t.mortality_rate ? `${Number(t.mortality_rate).toFixed(1)} %` : '-'}
                      {' · '}Aliment {fmtNumber(t.total_feed_consumed)} kg
                    </p>
                    {comp ? (
                      <p className="text-xs mt-1">
                        Comparaison Phase 1 - {comp.overall_message} ({comp.favorable_count} favorables, {comp.worse_count} moins performants)
                      </p>
                    ) : null}
                    <p className="text-xs mt-1">
                      {t.reviewed_by_human
                        ? `✓ Validé par ${t.reviewed_by} - décision : ${DECISION_LABEL[t.decision] || t.decision || '-'}`
                        : t.status === 'closed'
                          ? '! En attente de confirmation'
                          : ''}
                    </p>
                  </article>
                );
              })}
          </div>
        ) : (
          <p className="text-sm text-slate">Aucun essai encore ouvert.</p>
        )}
      </section>
    </div>
  );
}
