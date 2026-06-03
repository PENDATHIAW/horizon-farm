import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, ExternalLink, Eye, ShieldAlert } from 'lucide-react';
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
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : tone === 'bad'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>;
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
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-[#2f2415]">{result.title}</h3>
            <Pill tone={statusTone(result.status)}>{statusLabel(result.status)}</Pill>
          </div>
          <p className="mt-1 text-xs text-[#8a7456]">{result.description}</p>
          <p className="mt-1 text-[11px] text-[#8a7456]">
            Dernier test : {formatWorkflowQualityDate(result.lastTestedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.(result.sourceModule, result.sourceTab ? { tab: result.sourceTab } : undefined)}
            className="inline-flex items-center gap-1 rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black text-[#2f2415]"
          >
            <ExternalLink size={14} />
            Ouvrir module source
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black text-[#2f2415]"
          >
            <Eye size={14} />
            Voir détails
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            type="button"
            onClick={() => onManualValidate(result)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16]"
          >
            <CheckCircle2 size={14} />
            Marquer validé
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-800">Objets créés / détectés</p>
            {result.createdObjects.length ? (
              <ul className="mt-2 space-y-1 text-xs text-emerald-900">
                {result.createdObjects.map((item) => (
                  <li key={`${result.id}-created-${item.key}`}>
                    <b>{item.label}</b>
                    {item.id ? <span className="text-emerald-700"> · {item.id}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-emerald-800">Aucun objet détecté pour ce flux.</p>
            )}
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-red-800">Objets manquants</p>
            {result.missingObjects.length ? (
              <ul className="mt-2 space-y-1 text-xs text-red-900">
                {result.missingObjects.map((item) => (
                  <li key={`${result.id}-missing-${item.key}`}>
                    <b>{item.label}</b>
                    {item.detail ? <span className="text-red-700"> · {item.detail}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-red-800">Rien de manquant sur l’échantillon analysé.</p>
            )}
          </div>
          <div className="lg:col-span-2 rounded-xl border border-[#eadcc2] bg-white p-3 text-xs text-[#8a7456]">
            <p className="font-black text-[#2f2415]">Attendu</p>
            <p className="mt-1">{result.expectedObjects.join(' · ')}</p>
            {result.details ? <p className="mt-2"><b>Détail :</b> {result.details}</p> : null}
            {result.manualNote ? <p className="mt-2 text-emerald-800"><b>Note manuelle :</b> {result.manualNote}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function WorkflowQualityPanel({ dataMap = {}, onNavigate }) {
  const [manualVersion, setManualVersion] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

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
    const note = window.prompt(`Note optionnelle pour « ${result.title} »`, result.details || '');
    if (note === null) return;
    markWorkflowQualityManual(result.id, note);
    setManualVersion((value) => value + 1);
    toast.success('Flux marqué comme validé manuellement');
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
            <ClipboardCheck size={20} />
            Recette métier / Qualité des workflows
          </h2>
          <p className="mt-1 text-sm text-[#8a7456]">
            Vérification read-only des chaînes métier existantes — aucune nouvelle logique métier créée ici.
          </p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm min-w-[220px]">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#8a7456]">Qualité des workflows</p>
          <p className={`mt-1 text-2xl font-black ${score.score >= 75 ? 'text-emerald-700' : score.score >= 50 ? 'text-amber-700' : 'text-red-600'}`}>
            {score.score}/100
          </p>
          <p className="mt-1 text-xs text-[#8a7456]">
            {score.okCount} OK · {score.errorCount} erreur(s) · {score.untestedCount} non testé(s)
          </p>
        </div>
      </div>

      {score.errorCount > 0 ? (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
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
    </section>
  );
}
