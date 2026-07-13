import { Camera, CheckCircle2, FileScan, Loader2, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { assessDraftSafety } from '../../services/aiGateway/aiSafetyGuard.js';
import { executeScannerDraft } from '../../services/aiGateway/documentScannerExecute.js';
import { scanDocumentToDraft } from '../../services/aiGateway/documentScannerService.js';
import {
  SCANNER_DOC_TYPES,
  SCANNER_DOC_TYPE_LABELS,
  SCANNER_MIME_ACCEPT,
} from '../../services/aiGateway/documentScannerTypes.js';
import {
  createPreviewUrl,
  revokePreviewUrl,
} from '../../services/aiGateway/documentTextExtraction.js';
import { fmtCurrency } from '../../utils/format';

const TYPE_OPTIONS = [
  { id: SCANNER_DOC_TYPES.PURCHASE_INVOICE, hint: 'Intrants, aliment, matériel' },
  { id: SCANNER_DOC_TYPES.VET_PRESCRIPTION, hint: 'Vaccin, traitement, dose' },
  { id: SCANNER_DOC_TYPES.PAYMENT_RECEIPT, hint: 'Encaissement client' },
  { id: SCANNER_DOC_TYPES.DELIVERY_NOTE, hint: 'Réception marchandises' },
];

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-black text-[#8a7456]">{label}</span>
      {children}
    </label>
  );
}

function inputCls() {
  return 'w-full rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-semibold text-[#2f2415]';
}

export default function DocumentScannerPanel({
  context = {},
  handlers = {},
  onSuccess,
}) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [draft, setDraft] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [extractionHint, setExtractionHint] = useState('');

  const safety = useMemo(() => (draft ? assessDraftSafety(draft) : null), [draft]);

  const resetPreview = useCallback((url) => {
    setPreviewUrl((prev) => {
      if (prev && prev !== url) revokePreviewUrl(prev);
      return url;
    });
  }, []);

  useEffect(() => () => revokePreviewUrl(previewUrl), [previewUrl]);

  const onPickFile = (picked) => {
    if (!picked) return;
    setFile(picked);
    resetPreview(createPreviewUrl(picked));
    setDraft(null);
    setEditFields({});
  };

  const runScan = async () => {
    if (!file && !pastedText.trim()) {
      toast.error('Importez une photo ou collez le texte du document.');
      return;
    }
    setScanning(true);
    try {
      const proofUrl = previewUrl || '';
      const { draft: nextDraft, extraction, empty } = await scanDocumentToDraft({
        file,
        pastedText,
        docType,
        context,
        proofMeta: {
          proof_url: proofUrl,
          file_url: proofUrl,
          fileName: file?.name,
          document_title: file?.name || 'Document scanné',
          module_source: 'documents_rapports',
        },
      });
      setDraft(nextDraft);
      setEditFields({ ...(nextDraft.draft?.fields || {}) });
      setExtractionHint(extraction.hint || (empty ? 'Ajoutez le texte extrait pour améliorer la détection.' : ''));
      if (empty) toast('Texte limité — complétez ci-dessous puis relancez.', { icon: '⚠️' });
      else toast.success('Brouillon préparé — vérifiez avant validation.');
    } catch (e) {
      toast.error(e.message || 'Analyse impossible');
    } finally {
      setScanning(false);
    }
  };

  const mergeDraftForExecute = () => {
    if (!draft) return null;

    return {
      ...draft,
      draft: {
        ...draft.draft,
        fields: { ...draft.draft?.fields, ...editFields },
        payload: { ...draft.draft?.payload, ...editFields },
        proof: {
          ...draft.draft?.proof,
          proof_url: previewUrl,
          file_url: previewUrl,
        },
      },
      missing_fields: [],
      confirmation_required: false,
    };
  };

  const onValidateExecute = async () => {
    const merged = mergeDraftForExecute();
    if (!merged) return;
    const assessment = assessDraftSafety(merged);
    if (assessment.requiresValidation && merged.confidence < 0.65) {
      toast.error('Confiance faible : complétez les champs puis confirmez.');
      return;
    }
    setExecuting(true);
    try {
      const result = await executeScannerDraft(merged, handlers, context);
      if (!result.ok) {
        toast.error(result.error || 'Exécution refusée');
        return;
      }
      toast.success('Document validé — opération enregistrée via le workflow métier.');
      setDraft(null);
      setFile(null);
      setPastedText('');
      setEditFields({});
      resetPreview('');
      onSuccess?.(result);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setExecuting(false);
    }
  };

  const scannerType = draft?.draft?.scanner_doc_type;
  const isPurchase = scannerType === SCANNER_DOC_TYPES.PURCHASE_INVOICE
    || scannerType === SCANNER_DOC_TYPES.DELIVERY_NOTE;
  const isHealth = scannerType === SCANNER_DOC_TYPES.VET_PRESCRIPTION;
  const isPayment = scannerType === SCANNER_DOC_TYPES.PAYMENT_RECEIPT;

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#9a6b12] font-black">Scanner IA</p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-[#2f2415]">
          <FileScan size={22} />
          Scanner document
        </h2>
        <p className="mt-1 text-sm text-[#8a7456]">
          Photo ou import → extraction → brouillon → validation → workflow existant (achat stock, santé, encaissement).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setDocType(docType === opt.id ? '' : opt.id)}
            className={`rounded-2xl border p-3 text-left transition ${docType === opt.id ? 'border-emerald-400 bg-emerald-50' : 'border-[#eadcc2] bg-[#fffdf8] hover:border-[#d6c3a0]'}`}
          >
            <b className="text-sm text-[#2f2415]">{SCANNER_DOC_TYPE_LABELS[opt.id]}</b>
            <p className="mt-1 text-xs text-[#8a7456]">{opt.hint}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={SCANNER_MIME_ACCEPT}
          capture="environment"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]"
        >
          <Camera size={16} />
          Prendre une photo
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]"
        >
          <Upload size={16} />
          Importer
        </button>
        <button
          type="button"
          disabled={scanning}
          onClick={runScan}
          className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2 text-xs font-black text-[#052e16] disabled:opacity-50"
        >
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <FileScan size={16} />}
          Analyser
        </button>
      </div>

      {previewUrl ? (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
          <p className="text-xs font-black text-[#8a7456] mb-2">Aperçu</p>
          {file?.type?.startsWith('image/') ? (
            <img src={previewUrl} alt="Document scanné" className="max-h-48 rounded-xl object-contain" />
          ) : (
            <p className="text-sm text-[#2f2415]">{file?.name}</p>
          )}
        </div>
      ) : null}

      <Field label="Texte extrait (OCR ou collage manuel)">
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          rows={4}
          placeholder="Collez ici le texte de la facture si l'OCR n'est pas disponible…"
          className={inputCls()}
        />
      </Field>
      {extractionHint ? <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{extractionHint}</p> : null}

      {draft ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <b className="text-[#2f2415]">{draft.draft?.scanner_doc_label}</b>
              <p className="text-xs text-[#8a7456]">
                Confiance {Math.round((draft.confidence || 0) * 100)}% · Workflow {draft.target_workflow}
              </p>
            </div>
            {safety?.needsConfirmation ? (
              <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                Confirmation requise
              </span>
            ) : null}
          </div>

          {draft.warnings?.length ? (
            <ul className="text-xs text-amber-900 space-y-1">
              {draft.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          ) : null}

          {isPurchase ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Fournisseur">
                <input className={inputCls()} value={editFields.fournisseur || ''} onChange={(e) => setEditFields((f) => ({ ...f, fournisseur: e.target.value }))} />
              </Field>
              <Field label="Date">
                <input type="date" className={inputCls()} value={editFields.date || ''} onChange={(e) => setEditFields((f) => ({ ...f, date: e.target.value }))} />
              </Field>
              <Field label="Produit">
                <input className={inputCls()} value={editFields.produit || ''} onChange={(e) => setEditFields((f) => ({ ...f, produit: e.target.value }))} />
              </Field>
              <Field label="Quantité">
                <input type="number" className={inputCls()} value={editFields.quantite ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, quantite: Number(e.target.value) }))} />
              </Field>
              <Field label="Prix unitaire (FCFA)">
                <input type="number" className={inputCls()} value={editFields.prix_unitaire ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, prix_unitaire: Number(e.target.value) }))} />
              </Field>
              <Field label="Total (FCFA)">
                <input type="number" className={inputCls()} value={editFields.montant_total ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, montant_total: Number(e.target.value) }))} />
              </Field>
              <Field label="Paiement">
                <select className={inputCls()} value={editFields.statut_paiement || 'paye'} onChange={(e) => setEditFields((f) => ({ ...f, statut_paiement: e.target.value, payment_status: e.target.value }))}>
                  <option value="paye">Payé</option>
                  <option value="partiel">Partiel</option>
                  <option value="a_payer">À payer</option>
                </select>
              </Field>
            </div>
          ) : null}

          {isHealth ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Médicament / soin">
                <input className={inputCls()} value={editFields.nom || ''} onChange={(e) => setEditFields((f) => ({ ...f, nom: e.target.value }))} />
              </Field>
              <Field label="Lot (ID)">
                <input className={inputCls()} value={editFields.lot_id || ''} onChange={(e) => setEditFields((f) => ({ ...f, lot_id: e.target.value }))} />
              </Field>
              <Field label="Animal (ID)">
                <input className={inputCls()} value={editFields.animal_id || ''} onChange={(e) => setEditFields((f) => ({ ...f, animal_id: e.target.value }))} />
              </Field>
              <Field label="Dose">
                <input className={inputCls()} value={editFields.dose || ''} onChange={(e) => setEditFields((f) => ({ ...f, dose: e.target.value }))} />
              </Field>
              <Field label="Rappel (jours)">
                <input type="number" className={inputCls()} value={editFields.rappel_jours ?? 7} onChange={(e) => setEditFields((f) => ({ ...f, rappel_jours: Number(e.target.value) }))} />
              </Field>
              <Field label="Stock pharmacie (ID)">
                <input className={inputCls()} value={editFields.stock_id || ''} onChange={(e) => setEditFields((f) => ({ ...f, stock_id: e.target.value }))} />
              </Field>
            </div>
          ) : null}

          {isPayment ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Réf. vente / commande">
                <input className={inputCls()} value={editFields.sale_id || ''} onChange={(e) => setEditFields((f) => ({ ...f, sale_id: e.target.value }))} />
              </Field>
              <Field label="Client">
                <input className={inputCls()} value={editFields.client_name || ''} onChange={(e) => setEditFields((f) => ({ ...f, client_name: e.target.value }))} />
              </Field>
              <Field label="Montant (FCFA)">
                <input type="number" className={inputCls()} value={editFields.montant ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, montant: Number(e.target.value), requestedAmount: Number(e.target.value) }))} />
              </Field>
              <p className="md:col-span-2 text-sm text-[#8a7456]">
                Montant détecté : {fmtCurrency(editFields.montant || 0)}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            disabled={executing}
            onClick={onValidateExecute}
            className="inline-flex items-center gap-2 rounded-xl bg-[#166534] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {executing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            Valider et enregistrer (workflow métier)
          </button>
        </div>
      ) : null}
    </section>
  );
}
