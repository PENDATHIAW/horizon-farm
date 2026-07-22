import { useMemo, useState } from 'react';
import { FileText, Copy, Check } from 'lucide-react';
import { buildFarmDigest, renderDigestText } from '../../services/farmDigestReport.js';

/**
 * Rapport de synthèse ferme : digest hebdo/mensuel prêt à copier (WhatsApp,
 * e-mail). Assemble cockpit + prédictions + relances en un brief actionnable.
 */
export default function FarmDigestPanel({ data = {} }) {
  const [period, setPeriod] = useState('hebdo');
  const [copied, setCopied] = useState(false);

  const digest = useMemo(() => {
    try { return buildFarmDigest(data, { period }); } catch { return null; }
  }, [data, period]);

  if (!digest) return null;
  const text = renderDigestText(digest);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* presse-papiers indisponible */ }
  };

  return (
    <section className="hf-card space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-label font-semibold uppercase text-earth">
          <FileText size={15} aria-hidden="true" /> Rapport de synthèse
        </p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-line bg-card p-0.5">
            {['hebdo', 'mensuel'].map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)} className={`rounded-lg px-3 py-1 text-xs font-semibold ${period === p ? 'bg-earth text-white' : 'text-earth'}`}>
                {p === 'hebdo' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-earth">
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Points d'attention" value={digest.summary.attention} />
        <Stat label="À anticiper" value={digest.summary.predictions} />
        <Stat label="Relances" value={digest.summary.relances} />
        <Stat label="Actions" value={digest.summary.actions} />
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl border border-line bg-card p-3 text-sm text-earth">{text}</pre>
      <p className="text-meta text-slate">Prêt à envoyer à la direction ou au financeur.</p>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-card p-2 text-center">
      <p className="text-lg font-semibold text-earth tabular-nums">{value}</p>
      <p className="text-meta text-slate">{label}</p>
    </div>
  );
}
