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
import { EXPENSE_CATEGORIES } from '../../services/aiGateway/expenseReceiptCategorizer.js';
import { buildExpensePayloadFromScan } from '../../services/aiGateway/documentScannerDrafts.js';
import { openFormModal } from '../../services/formModalManager.js';
import { fmtCurrency } from '../../utils/format';

const TYPE_OPTIONS = [
  { id: SCANNER_DOC_TYPES.PURCHASE_INVOICE, hint: 'Intrants, aliment, matériel' },
  { id: SCANNER_DOC_TYPES.EXPENSE_RECEIPT, hint: 'Carburant, transport, énergie, réparation' },
  { id: SCANNER_DOC_TYPES.VET_PRESCRIPTION, hint: 'Vaccin, traitement, dose' },
  { id: SCANNER_DOC_TYPES.PAYMENT_RECEIPT, hint: 'Encaissement client' },
  { id: SCANNER_DOC_TYPES.DELIVERY_NOTE, hint: 'Réception marchandises' },
];

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
      if (empty) toast('Texte limité - complétez ci-dessous puis relancez.', { icon: '⚠️' });
      else toast.success('Brouillon préparé - vérifiez avant validation.');
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

    // Reçu de dépense : on n'exécute pas (OPEN_FORM), on ouvre le formulaire dépense
    // pré-catégorisé pour finalisation et validation dans le module Finance.
    if (isExpense) {
      const payload = buildExpensePayloadFromScan(
        { ...merged.draft?.fields, ...editFields },
        merged.draft?.proof || {},
      );
      openFormModal({
        module: 'finance_pilotage',
        draft: {
          primary_module: 'finance_pilotage',
          form_type: 'finance_entry',
          intent_label: 'Dépense (reçu scanné)',
          status: 'draft_ready',
          draft_fields: payload,
          context: { activite: payload.activite, sens: 'sortie', module: 'finance_pilotage' },
        },
      });
      toast.success('Dépense pré-remplie - vérifiez et enregistrez dans Finance.');
      setDraft(null);
      setFile(null);
      setPastedText('');
      setEditFields({});
      resetPreview('');
      return;
    }

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
      toast.success('Document validé - opération enregistrée via le workflow métier.');
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
  const isExpense = scannerType === SCANNER_DOC_TYPES.EXPENSE_RECEIPT;

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-6">
      <div>
        <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">Scanner</p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-earth">
          <FileScan size={22} />
          Scanner document
        </h2>
        <p className="mt-1 text-sm text-slate">
          Photo ou import → extraction → brouillon → validation → workflow existant (achat stock, santé, encaissement).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setDocType(docType === opt.id ? '' : opt.id)}
            className={`rounded-2xl border p-3 text-left transition ${docType === opt.id ? 'border-positive bg-positive-bg' : 'border-line bg-card hover:border-line'}`}
          >
            <b className="text-sm text-earth">{SCANNER_DOC_TYPE_LABELS[opt.id]}</b>
            <p className="mt-1 text-xs text-slate">{opt.hint}</p>
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
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2 text-xs font-semibold text-earth hover:bg-positive-bg"
        >
          <Camera size={16} />
          Prendre une photo
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2 text-xs font-semibold text-earth hover:bg-positive-bg"
        >
          <Upload size={16} />
          Importer
        </button>
        <button
          type="button"
          disabled={scanning}
          onClick={runScan}
          className="inline-flex items-center gap-2 rounded-xl bg-leaf px-4 py-2 text-xs font-semibold text-earth disabled:opacity-50"
        >
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <FileScan size={16} />}
          Analyser
        </button>
      </div>

      {previewUrl ? (
        <div className="rounded-2xl border border-line bg-card p-3">
          <p className="text-xs font-semibold text-slate mb-2">Aperçu</p>
          {file?.type?.startsWith('image/') ? (
            <img src={previewUrl} alt="Document scanné" className="max-h-48 rounded-xl object-contain" />
          ) : (
            <p className="text-sm text-earth">{file?.name}</p>
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
      {extractionHint ? <p className="text-xs text-horizon-dark bg-vigilance-bg border border-vigilance rounded-xl px-3 py-2">{extractionHint}</p> : null}

      {draft ? (
        <div className="rounded-2xl border border-positive bg-positive-bg p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <b className="text-earth">{draft.draft?.scanner_doc_label}</b>
              <p className="text-xs text-slate">
                Confiance {Math.round((draft.confidence || 0) * 100)}% · Workflow {draft.target_workflow}
              </p>
            </div>
            {safety?.needsConfirmation ? (
              <span className="rounded-full border border-vigilance bg-vigilance-bg px-3 py-1 text-xs font-semibold text-horizon-dark">
                Confirmation requise
              </span>
            ) : null}
          </div>

          {draft.warnings?.length ? (
            <ul className="text-xs text-horizon-dark space-y-1">
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
              <p className="md:col-span-2 text-sm text-slate">
                Montant détecté : {fmtCurrency(editFields.montant || 0)}
              </p>
            </div>
          ) : null}

          {isExpense ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Marchand / bénéficiaire">
                <input className={inputCls()} value={editFields.marchand || ''} onChange={(e) => setEditFields((f) => ({ ...f, marchand: e.target.value }))} />
              </Field>
              <Field label="Catégorie">
                <select className={inputCls()} value={editFields.categorie || 'Autre'} onChange={(e) => setEditFields((f) => ({ ...f, categorie: e.target.value }))}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Activité (optionnel)">
                <select className={inputCls()} value={editFields.activite || ''} onChange={(e) => setEditFields((f) => ({ ...f, activite: e.target.value }))}>
                  <option value="">Générale</option>
                  <option value="volailles">Volailles</option>
                  <option value="bovins">Bovins</option>
                  <option value="petits_ruminants">Petits ruminants</option>
                  <option value="cultures">Cultures</option>
                </select>
              </Field>
              <Field label="Montant (FCFA)">
                <input type="number" className={inputCls()} value={editFields.montant ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, montant: Number(e.target.value) }))} />
              </Field>
              <Field label="Date">
                <input type="date" className={inputCls()} value={editFields.date || ''} onChange={(e) => setEditFields((f) => ({ ...f, date: e.target.value }))} />
              </Field>
              <p className="md:col-span-2 text-sm text-slate">
                Dépense proposée : {editFields.categorie || 'Autre'} · {fmtCurrency(editFields.montant || 0)}. Vérifiez puis enregistrez.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            disabled={executing}
            onClick={onValidateExecute}
            className="inline-flex items-center gap-2 rounded-xl bg-positive px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {executing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            Valider et enregistrer (workflow métier)
          </button>
        </div>
      ) : null}
    </section>
  );
}
