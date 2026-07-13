import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, ExternalLink, Eye, ShieldAlert } from 'lucide-react';
import QuickInputModal from '../QuickInputModal.jsx';
import toast from 'react-hot-toast';
import {
  auditWorkflowQuality,
  computeWorkflowQualityScore,
  formatWorkflowQualityDate,
} from '../../utils/workflowQualityAudit';
import {
  markWorkflowQualityManual,
  readWorkflowQualityManualChecks,
} from '../../utils/workflowQualityStore';

function Pill({ children, tone = 'neutral' }) {
  const cls = tone === 'good'
    ? 'border-positive bg-positive-bg text-positive'
    : tone === 'warn'
      ? 'border-vigilance bg-vigilance-bg text-horizon-dark'
      : tone === 'bad'
        ? 'border-urgent bg-urgent-bg text-urgent'
        : 'border-line bg-card text-slate';
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

function statusTone(status = '') {
  if (status === 'ok' || status === 'manual_ok') return 'good';
  if (status === 'error') return 'bad';
  return 'warn';
}

function statusLabel(status = '') {
  if (status === 'ok') return 'OK';
  if (status === 'manual_ok') return 'Validé manuellement';
  if (status === 'error') return 'Erreur';
  return 'Non testé';
}

function WorkflowRow({ result, expanded, onToggle, onNavigate, onManualValidate }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-earth">{result.title}</h3>
            <Pill tone={statusTone(result.status)}>{statusLabel(result.status)}</Pill>
          </div>
          <p className="mt-1 text-xs text-slate">{result.description}</p>
          <p className="mt-1 text-meta text-slate">
            Dernier test : {formatWorkflowQualityDate(result.lastTestedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.(result.sourceModule, result.sourceTab ? { tab: result.sourceTab } : undefined)}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold text-earth"
          >
            <ExternalLink size={14} />
            Ouvrir module source
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold text-earth"
          >
            <Eye size={14} />
            Voir détails
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            type="button"
            onClick={() => onManualValidate(result)}
            className="inline-flex items-center gap-1 rounded-lg bg-leaf px-2 py-1 text-xs font-semibold text-earth"
          >
            <CheckCircle2 size={14} />
            Marquer validé
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-positive bg-positive-bg p-3">
            <p className="text-meta font-semibold uppercase tracking-normal text-positive">Objets créés / détectés</p>
            {result.createdObjects.length ? (
              <ul className="mt-2 space-y-1 text-xs text-positive">
                {result.createdObjects.map((item) => (
                  <li key={`${result.id}-created-${item.key}`}>
                    <b>{item.label}</b>
                    {item.id ? <span className="text-positive"> · {item.id}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-positive">Aucun objet détecté pour ce flux.</p>
            )}
          </div>
          <div className="rounded-xl border border-urgent bg-urgent-bg p-3">
            <p className="text-meta font-semibold uppercase tracking-normal text-urgent">Objets manquants</p>
            {result.missingObjects.length ? (
              <ul className="mt-2 space-y-1 text-xs text-urgent">
                {result.missingObjects.map((item) => (
                  <li key={`${result.id}-missing-${item.key}`}>
                    <b>{item.label}</b>
                    {item.detail ? <span className="text-urgent"> · {item.detail}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-urgent">Rien de manquant sur l’échantillon analysé.</p>
            )}
          </div>
          <div className="lg:col-span-2 rounded-xl border border-line bg-white p-3 text-xs text-slate">
            <p className="font-semibold text-earth">Attendu</p>
            <p className="mt-1">{result.expectedObjects.join(' · ')}</p>
            {result.details ? <p className="mt-2"><b>Détail :</b> {result.details}</p> : null}
            {result.manualNote ? <p className="mt-2 text-positive"><b>Note manuelle :</b> {result.manualNote}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function WorkflowQualityPanel({ dataMap = {}, onNavigate }) {
  const [manualVersion, setManualVersion] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [validateTarget, setValidateTarget] = useState(null);
  const [validateNote, setValidateNote] = useState('');

  const manualChecks = useMemo(() => {
    void manualVersion;
    return readWorkflowQualityManualChecks();
  }, [manualVersion]);

  const results = useMemo(
    () => auditWorkflowQuality(dataMap, manualChecks),
    [dataMap, manualChecks],
  );
  const score = useMemo(() => computeWorkflowQualityScore(results), [results]);

  const handleManualValidate = (result) => {
    setValidateTarget(result);
    setValidateNote(result.details || '');
  };

  const submitManualValidate = () => {
    if (!validateTarget) return;
    markWorkflowQualityManual(validateTarget.id, validateNote);
    setManualVersion((value) => value + 1);
    setValidateTarget(null);
    setValidateNote('');
    toast.success('Flux marqué comme validé manuellement');
  };

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-earth">
            <ClipboardCheck size={20} />
            Recette métier / Qualité des workflows
          </h2>
          <p className="mt-1 text-sm text-slate">
            Vérification read-only des chaînes métier existantes — aucune nouvelle logique métier créée ici.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card px-4 py-3 text-sm min-w-[220px]">
          <p className="text-meta font-semibold uppercase tracking-normal text-slate">Qualité des workflows</p>
          <p className={`mt-1 text-2xl font-semibold ${score.score >= 75 ? 'text-positive' : score.score >= 50 ? 'text-horizon-dark' : 'text-urgent'}`}>
            {score.score}/100
          </p>
          <p className="mt-1 text-xs text-slate">
            {score.okCount} OK · {score.errorCount} erreur(s) · {score.untestedCount} non testé(s)
          </p>
        </div>
      </div>

      {score.errorCount > 0 ? (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark">
          <ShieldAlert size={18} className="mt-1 shrink-0" />
          <p>
            {score.errorCount} flux présentent des objets manquants sur les données actuelles.
            Utilisez « Ouvrir module source » pour corriger dans le module métier, ou « Marquer validé » après contrôle manuel.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {results.map((result) => (
          <WorkflowRow
            key={result.id}
            result={result}
            expanded={expandedId === result.id}
            onToggle={() => setExpandedId((current) => (current === result.id ? null : result.id))}
            onNavigate={onNavigate}
            onManualValidate={handleManualValidate}
          />
        ))}
      </div>
      <QuickInputModal
        open={Boolean(validateTarget)}
        title={validateTarget ? `Valider « ${validateTarget.title} »` : 'Valider le flux'}
        label="Note optionnelle"
        type="textarea"
        value={validateNote}
        onChange={setValidateNote}
        required={false}
        submitLabel="Marquer validé"
        onClose={() => { setValidateTarget(null); setValidateNote(''); }}
        onSubmit={submitManualValidate}
      />
    </section>
  );
}
