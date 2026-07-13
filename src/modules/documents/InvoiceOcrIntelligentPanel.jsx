import { BrainCircuit, CheckCircle2, FileScan, Loader2, Play, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { assessDraftSafety } from '../../services/aiGateway/aiSafetyGuard.js';
import { createPreviewUrl, revokePreviewUrl } from '../../services/aiGateway/documentTextExtraction.js';
import { SCANNER_MIME_ACCEPT } from '../../services/aiGateway/documentScannerTypes.js';
import {
  analyzeInvoiceDiagnostic,
  executeInvoiceDiagnosticDraft,
  validateInvoiceDiagnosticDraft,
} from '../../services/ocrIntelligent/invoiceDiagnosticDraftService.js';
import { INVOICE_OCR_DEMO_SAMPLES } from '../../services/ocrIntelligent/invoiceOcrParser.js';
import { fmtCurrency, fmtNumber } from '../../utils/format';

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate">{label}</span>
      {children}
    </label>
  );
}

function inputCls() {
  return 'w-full rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth';
}

function Pill({ children, tone = 'neutral' }) {
  const cls = tone === 'good'
    ? 'border-positive bg-positive-bg text-positive'
    : tone === 'warn'
      ? 'border-vigilance bg-vigilance-bg text-horizon-dark'
      : 'border-line bg-card text-slate';
  return <span className={`rounded-full border px-2 py-1 text-meta font-semibold ${cls}`}>{children}</span>;
}

function DiagnosticCard({ diagnostic, invoice }) {
  if (!diagnostic) return null;
  const rec = diagnostic.recommendation || {};
  const price = diagnostic.price_comparison || {};
  const margin = diagnostic.margin_impact || {};
  const treasury = diagnostic.treasury_impact || {};

  return (
    <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
      <p className="font-semibold text-earth">{rec.headline || 'Diagnostic économique'}</p>
      <p className="text-sm text-slate">{rec.summary}</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-3 text-xs">
          <span className="text-slate">Fournisseur</span>
          <p className="font-semibold text-earth">{invoice?.fournisseur || '-'}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3 text-xs">
          <span className="text-slate">Total</span>
          <p className="font-semibold text-earth">{fmtCurrency(invoice?.montant_total || 0)}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3 text-xs">
          <span className="text-slate">Évolution prix</span>
          <p className={`font-semibold ${price.trend === 'hausse' ? 'text-horizon-dark' : price.trend === 'baisse' ? 'text-positive' : 'text-earth'}`}>
            {price.delta_pct != null ? `${price.delta_pct > 0 ? '+' : ''}${price.delta_pct} %` : 'N/A'}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3 text-xs">
          <span className="text-slate">Stockable</span>
          <p className="font-semibold text-earth">{invoice?.stockable ? 'Oui' : 'Non (charge)'}</p>
        </div>
      </div>
      {margin.applicable ? (
        <div className="rounded-xl border border-vigilance bg-vigilance-bg p-3 text-xs text-horizon-dark space-y-1">
          <p>Marge brute estimée : {margin.marge_brute_avant_pct} % → {margin.marge_brute_apres_pct} % (prix vente ref. {fmtCurrency(margin.prix_vente_reference || 0)})</p>
          {margin.hausse_prix_conseillee_fcfa > 0 ? (
            <p>Prix conseillé : {fmtCurrency(margin.prix_vente_conseille)} (+{fmtNumber(margin.hausse_prix_conseillee_fcfa)} FCFA)</p>
          ) : null}
        </div>
      ) : null}
      {treasury.alerte_tresorerie ? (
        <p className="text-xs text-urgent font-semibold">{treasury.alerte_tresorerie}</p>
      ) : null}
      {rec.bullets?.length ? (
        <ul className="text-xs text-slate space-y-1">
          {rec.bullets.map((b) => <li key={b}>• {b}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

export default function InvoiceOcrIntelligentPanel({
  context = {},
  dataMap = {},
  handlers = {},
  onNavigate,
  onSuccess,
}) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [result, setResult] = useState(null);
  const [validatedDraft, setValidatedDraft] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);

  const draft = validatedDraft || result?.draft;
  const safety = useMemo(() => (draft ? assessDraftSafety(draft) : null), [draft]);

  const resetPreview = useCallback((url) => {
    setPreviewUrl((prev) => {
      if (prev && prev !== url) revokePreviewUrl(prev);
      return url;
    });
  }, []);

  useEffect(() => () => revokePreviewUrl(previewUrl), [previewUrl]);

  const runAnalyze = async (textOverride = '') => {
    const query = textOverride || pastedText;
    if (!file && !query.trim()) {
      toast.error('Importez une facture ou collez le texte OCR simulé.');
      return;
    }
    setScanning(true);
    setValidatedDraft(null);
    try {
      const analyzed = await analyzeInvoiceDiagnostic({
        file,
        pastedText: query,
        context,
        dataMap,
        proofMeta: {
          proof_url: previewUrl,
          file_url: previewUrl,
          fileName: file?.name,
          document_title: file?.name || 'Facture fournisseur OCR',
          module_source: 'documents_rapports',
        },
      });
      setResult(analyzed);
      if (analyzed.empty) {
        toast('Texte limité - complétez ci-dessous.', { icon: '⚠️' });
      } else {
        toast.success('Diagnostic économique prêt - validez avant enregistrement.');
      }
    } catch (e) {
      toast.error(e.message || 'Analyse impossible');
    } finally {
      setScanning(false);
    }
  };

  const onPickFile = (picked) => {
    if (!picked) return;
    setFile(picked);
    resetPreview(createPreviewUrl(picked));
    setResult(null);
    setValidatedDraft(null);
  };

  const onValidate = () => {
    if (!result?.draft) return;
    try {
      const validated = validateInvoiceDiagnosticDraft(result.draft);
      setValidatedDraft(validated);
      toast.success('Brouillon validé - vous pouvez exécuter le workflow.');
    } catch (e) {
      toast.error(e.message || 'Validation impossible');
    }
  };

  const onExecute = async () => {
    if (!validatedDraft) {
      toast.error('Validez d\'abord le diagnostic.');
      return;
    }
    setExecuting(true);
    try {
      const execResult = await executeInvoiceDiagnosticDraft(validatedDraft, handlers, context);
      if (!execResult.ok) {
        toast.error(execResult.error || 'Exécution refusée');
        return;
      }
      if (execResult.openedForm) {
        toast.success(execResult.message || 'Ouvrez le module pour compléter la saisie.');
        onNavigate?.('finance_pilotage');
      } else {
        toast.success('Réception stock enregistrée via le workflow Achats & Stock.');
        setResult(null);
        setValidatedDraft(null);
        setFile(null);
        setPastedText('');
        resetPreview('');
        onSuccess?.(execResult);
      }
    } catch (e) {
      toast.error(e.message || 'Exécution impossible');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-6">
      <div>
        <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">OCR Intelligent Horizon</p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-earth">
          <BrainCircuit size={22} />
          Diagnostic facture fournisseur
        </h2>
        <p className="mt-1 text-sm text-slate">
          Extraction + comparaison prix + impact marge & trésorerie. Brouillon validable - aucune écriture sans confirmation.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {INVOICE_OCR_DEMO_SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            onClick={() => {
              setPastedText(sample.text);
              runAnalyze(sample.text);
            }}
            className="rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-earth hover:bg-positive-bg"
          >
            {sample.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Importer facture (PDF / image)">
          <input ref={fileRef} type="file" accept={SCANNER_MIME_ACCEPT} className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-card px-4 py-6 text-sm font-semibold text-earth">
            <Upload size={18} />
            {file ? file.name : 'Choisir un fichier'}
          </button>
        </Field>
        <Field label="Texte OCR simulé (collage)">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={5}
            className={inputCls()}
            placeholder="Collez le texte de la facture si l'OCR n'est pas disponible…"
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={scanning}
          onClick={() => runAnalyze()}
          className="inline-flex items-center gap-2 rounded-xl bg-earth px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {scanning ? <Loader2 size={14} className="animate-spin" /> : <FileScan size={14} />}
          {scanning ? 'Analyse…' : 'Analyser la facture'}
        </button>
        <button
          type="button"
          disabled={!result?.draft || Boolean(validatedDraft)}
          onClick={onValidate}
          className="inline-flex items-center gap-2 rounded-xl border border-positive bg-positive-bg px-4 py-2 text-xs font-semibold text-positive disabled:opacity-50"
        >
          <CheckCircle2 size={14} />
          Valider le brouillon
        </button>
        <button
          type="button"
          disabled={!validatedDraft || executing}
          onClick={onExecute}
          className="inline-flex items-center gap-2 rounded-xl bg-positive px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {executing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {executing ? 'Exécution…' : 'Exécuter réception stock'}
        </button>
      </div>

      {result?.diagnostic ? (
        <DiagnosticCard diagnostic={result.diagnostic} invoice={result.invoice} />
      ) : null}

      {draft ? (
        <div className="rounded-2xl border border-positive bg-positive-bg p-4 text-xs space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <Pill tone="good">Brouillon</Pill>
            <Pill>{Math.round((draft.confidence || 0) * 100)} % confiance</Pill>
            <Pill tone={draft.target_workflow === 'commitStockPurchaseWorkflow' ? 'good' : 'warn'}>
              {draft.target_workflow === 'commitStockPurchaseWorkflow' ? 'Réception stock' : 'Dépense (formulaire)'}
            </Pill>
            {validatedDraft ? <Pill tone="good">Validé</Pill> : null}
          </div>
          {safety?.needsConfirmation ? (
            <p className="text-horizon-dark">Confirmation requise avant exécution.</p>
          ) : null}
          {draft.warnings?.slice(0, 3).map((w) => (
            <p key={w} className="text-slate">• {w}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
