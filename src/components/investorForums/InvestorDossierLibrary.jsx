import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, FilePlus2, Link2, Paperclip, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  addInvestorForumDocument,
  categoryLabel,
  deleteInvestorForumDocument,
  DOSSIER_FILE_CATEGORIES,
  listInvestorForumDocuments,
  readDossierFileBlob,
} from '../../services/investorForums/investorForumDocumentsService.js';

function downloadDataUrl(dataUrl, filename) {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename || 'document';
  anchor.click();
}

function previewDataUrl(dataUrl) {
  if (!dataUrl) return;
  window.open(dataUrl, '_blank', 'noopener');
}

export default function InvestorDossierLibrary({ erpDocuments = [], onRefresh }) {
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('business_plan');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    const rows = await listInvestorForumDocuments();
    setFiles(rows);
    onRefresh?.(rows.length);
  }, [onRefresh]);

  useEffect(() => { load(); }, [load]);

  const unattachedErp = useMemo(() => {
    const linked = new Set(files.map((f) => f.erp_document_id).filter(Boolean));
    return (erpDocuments || []).filter((d) => d?.id && !linked.has(String(d.id))).slice(0, 20);
  }, [erpDocuments, files]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await addInvestorForumDocument({
        category,
        title: title || file.name,
        filename: file.name,
        fileBlob: file,
      });
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
      toast.success('Fichier ajouté au dossier');
    } catch (error) {
      toast.error(error.message || 'Ajout impossible');
    } finally {
      setBusy(false);
    }
  };

  const attachErpDoc = async (doc) => {
    setBusy(true);
    try {
      await addInvestorForumDocument({
        category: doc.document_category || 'justificatifs',
        title: doc.title || doc.id,
        filename: doc.title || 'document-erp',
        fileUrl: doc.file_url,
        erpDocumentId: doc.id,
        notes: `Rattaché depuis ERP · ${doc.module_source || 'documents'}`,
      });
      await load();
      toast.success('Document ERP rattaché');
    } catch (error) {
      toast.error(error.message || 'Rattachement impossible');
    } finally {
      setBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const map = {};
    DOSSIER_FILE_CATEGORIES.forEach((c) => { map[c.id] = []; });
    files.forEach((f) => {
      const key = map[f.category] ? f.category : 'autre';
      if (!map[key]) map[key] = [];
      map[key].push(f);
    });
    return map;
  }, [files]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
        <p className="flex items-center gap-2 font-black text-slate-900">
          <Paperclip size={18} />
          Data Room — Documents du dossier
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Business plan, prévisionnel, CV, présentation ERP, captures, rapports, photos, administratif, contrats, devis et attestations — upload, aperçu, versionning et téléchargement.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-[10px] font-black uppercase text-[#8a7456]">Catégorie</span>
            <select
              className="mt-1 w-full rounded-xl border border-[#d6c3a0] px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {DOSSIER_FILE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] font-black uppercase text-[#8a7456]">Titre (optionnel)</span>
            <input
              className="mt-1 w-full rounded-xl border border-[#d6c3a0] px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. BP Horizon Farm 2026"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            <FilePlus2 size={14} />
            Ajouter un fichier
          </button>
        </div>
      </section>

      {unattachedErp.length > 0 && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-emerald-900">
            <Link2 size={16} />
            Rattacher depuis Documents & Rapports (ERP)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {unattachedErp.map((doc) => (
              <button
                key={doc.id}
                type="button"
                disabled={busy}
                onClick={() => attachErpDoc(doc)}
                className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-900 hover:border-emerald-600 disabled:opacity-60"
              >
                + {doc.title || doc.id}
              </button>
            ))}
          </div>
        </section>
      )}

      {files.length === 0 ? (
        <p className="text-sm text-[#8a7456] italic rounded-xl border border-dashed border-[#d6c3a0] p-6 text-center">
          Aucun document attaché. Ajoutez des pièces pour renforcer le dossier banque / subvention.
        </p>
      ) : (
        DOSSIER_FILE_CATEGORIES.filter((cat) => (grouped[cat.id] || []).length > 0).map((cat) => (
          <section key={cat.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <p className="text-xs font-black uppercase tracking-widest text-[#8a7456]">{cat.label}</p>
            <div className="mt-3 space-y-2">
              {(grouped[cat.id] || []).map((file) => {
                const blob = readDossierFileBlob(file.id) || file.file_url;
                return (
                  <div key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-[#eadcc2] bg-white p-3">
                    <div>
                      <p className="font-black text-[#2f2415]">{file.title}</p>
                      <p className="text-xs text-[#8a7456] mt-0.5">
                        {categoryLabel(file.category)} · {file.filename}
                        {file.version_label ? ` · ${file.version_label}` : ''}
                        {file.erp_document_id ? ' · ERP' : ''}
                        {file.created_at ? ` · ${new Date(file.created_at).toLocaleDateString('fr-FR')}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {blob ? (
                        <>
                          <button
                            type="button"
                            onClick={() => previewDataUrl(blob)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold"
                          >
                            <Eye size={12} />
                            Aperçu
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadDataUrl(blob, file.filename)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#d6c3a0] px-3 py-1.5 text-xs font-bold"
                          >
                            <Download size={12} />
                            Télécharger
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteInvestorForumDocument(file.id);
                          await load();
                          toast.success('Document retiré');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800"
                      >
                        <Trash2 size={12} />
                        Retirer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
