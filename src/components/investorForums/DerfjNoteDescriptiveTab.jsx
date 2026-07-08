import { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileText, Pencil, RotateCcw, Save, ShieldAlert, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  buildDerfjNoteDescriptive,
  computeDerfjNoteCompleteness,
  renderDerfjNoteSections,
} from '../../services/investorForums/derfjNoteDescriptive.js';
import { fmtCurrency } from '../../utils/format.js';

const STORAGE_KEY = 'horizon-farm-derfj-note-manual-draft-v1';
const arr = (value) => (Array.isArray(value) ? value : []);

function loadManualDraft() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveManualDraft(draft) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft || {}));
  } catch {
    // localStorage saturé ou indisponible — ignoré
  }
}

function clearManualDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignoré
  }
}

const PROMOTEUR_FIELDS = [
  { key: 'nom', label: 'Nom' },
  { key: 'prenoms', label: 'Prénoms' },
  { key: 'date_naissance', label: 'Date de naissance', type: 'date' },
  { key: 'lieu_naissance', label: 'Lieu de naissance' },
  { key: 'nationalite', label: 'Nationalité' },
  { key: 'genre', label: 'Genre' },
  { key: 'situation_matrimoniale', label: 'Situation matrimoniale' },
  { key: 'adresse_residence', label: 'Adresse de résidence' },
  { key: 'cin', label: 'CIN' },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'niveau_etude', label: 'Niveau d\'étude' },
  { key: 'experience', label: 'Expérience' },
];

const PROJET_FIELDS = [
  { key: 'nom', label: 'Nom du projet' },
  { key: 'statut_juridique', label: 'Statut juridique' },
  { key: 'statut_creation', label: 'Statut création' },
  { key: 'secteur', label: 'Secteur' },
  { key: 'sous_secteur', label: 'Sous-secteur' },
  { key: 'adresse_siege', label: 'Adresse du siège' },
  { key: 'region', label: 'Région' },
  { key: 'departement', label: 'Département' },
  { key: 'commune', label: 'Commune' },
];

function pdfSection(doc, title, body, y) {
  if (y > 260) { doc.addPage(); y = 22; }
  doc.setFontSize(12);
  doc.setTextColor(47, 36, 21);
  doc.setFont(undefined, 'bold');
  doc.text(title, 14, y);
  y += 6;
  doc.setFontSize(9.5);
  doc.setFont(undefined, 'normal');
  const lines = doc.splitTextToSize(String(body || '—'), 182);
  doc.text(lines, 14, y);
  return y + lines.length * 4.5 + 6;
}

function exportPdf(note) {
  const sections = renderDerfjNoteSections(note);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(248, 245, 239);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(47, 36, 21);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('DER/FJ GREENPRENEURS', 16, 40);
  doc.text('NOTE DESCRIPTIVE', 16, 54);
  doc.setFontSize(20);
  doc.text('DU PROJET', 16, 66);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(15);
  doc.text(note.identificationProjet?.nom || 'HORIZON FARM', 16, 88);
  doc.setFontSize(11);
  doc.text(`Promotrice : ${note.identificationPromoteur?.nom || ''} ${note.identificationPromoteur?.prenoms || ''}`.trim(), 16, 100);
  doc.text(`Programme : ${note.meta?.program || 'DER/FJ Greenpreneurs'}`, 16, 108);
  doc.text(`Localisation : ${note.identificationProjet?.adresse_siege || '—'}`, 16, 116);
  doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 16, 124);

  autoTable(doc, {
    startY: 138,
    head: [['Indicateur clé', 'Valeur']],
    body: [
      ['Coût total du projet', fmtCurrency(note.financiers?.cout_total_projet)],
      ['Apport personnel', fmtCurrency(note.financiers?.plan_financement?.apport_personnel)],
      ['Concours DER/FJ demandé', fmtCurrency(note.financiers?.plan_financement?.derfj_demande)],
      ['CA annuel projeté (an 1)', fmtCurrency(note.financiers?.ca_annuel_projete)],
      ['Emplois directs prévus', String(note.impact?.emplois_directs || 0)],
      ['Score Greenpreneurs', note.impact?.greenpreneurs_score ? `${note.impact.greenpreneurs_score}/100` : '—'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [47, 36, 21], textColor: 255 },
    styles: { fontSize: 9 },
  });

  doc.addPage();
  let y = 22;
  sections.forEach((section) => {
    y = pdfSection(doc, section.title, section.body, y);
  });

  // Annexe produits (tableau)
  if (arr(note.produits).length) {
    if (y > 220) { doc.addPage(); y = 22; }
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Détail produits et services (BP)', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Produit', 'Quantité/an', 'Prix unitaire', 'CA annuel']],
      body: arr(note.produits).map((p) => [
        p.label,
        String(p.quantite_annuelle || '—'),
        fmtCurrency(p.prix_unitaire),
        fmtCurrency(p.ca_annuel),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [47, 36, 21], textColor: 255 },
      styles: { fontSize: 8 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Annexe investissements
  if (arr(note.techniques?.materiel).length) {
    if (y > 220) { doc.addPage(); y = 22; }
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Détail matériel & investissements (BP)', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Désignation', 'Quantité', 'Unité', 'Total']],
      body: arr(note.techniques.materiel).slice(0, 20).map((row) => [
        row.designation,
        String(row.quantite || '—'),
        row.unite || '—',
        fmtCurrency(row.total),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [47, 36, 21], textColor: 255 },
      styles: { fontSize: 8 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Pagination
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(125, 106, 74);
    doc.text(`Horizon Farm · Note descriptive DER/FJ · ${i}/${pages}`, 105, 289, { align: 'center' });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `Horizon-Farm-Note-descriptive-DERFJ-${stamp}.pdf`;
  doc.save(filename);
  return { filename };
}

function FieldInput({ label, value, onChange, type = 'text', textarea, rows = 3 }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-black uppercase tracking-wide text-[#8a7456]">{label}</span>
      {textarea ? (
        <textarea
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415]"
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415]"
        />
      )}
    </label>
  );
}

function ListEditor({ label, value = [], onChange, placeholder = 'Une ligne par élément…', rows = 5 }) {
  const text = arr(value).join('\n');
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-black uppercase tracking-wide text-[#8a7456]">{label}</span>
      <textarea
        rows={rows}
        value={text}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value.split('\n').map((line) => line.trim()).filter(Boolean))}
        className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415]"
      />
    </label>
  );
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-slate-900">
          {Icon ? <Icon size={18} /> : null}
          {title}
        </p>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function DerfjNoteDescriptiveTab({ data = {}, onCreateDocument, onRefreshDocuments, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [manual, setManual] = useState(loadManualDraft);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const note = useMemo(() => buildDerfjNoteDescriptive(data || {}, manual), [data, manual]);
  const completeness = useMemo(() => computeDerfjNoteCompleteness(note, manual), [note, manual]);

  const patchManual = useCallback((patch) => {
    setManual((prev) => {
      const next = { ...prev, ...patch };
      saveManualDraft(next);
      return next;
    });
  }, []);

  const patchPromoteur = useCallback((patch) => {
    patchManual({ promoteur: { ...(manual.promoteur || {}), ...patch } });
  }, [manual, patchManual]);

  const patchProjet = useCallback((patch) => {
    patchManual({ projet: { ...(manual.projet || {}), ...patch } });
  }, [manual, patchManual]);

  const resetDraft = useCallback(() => {
    if (typeof window !== 'undefined' && !window.confirm('Réinitialiser le brouillon manuel ? Les champs auto-remplis par l\'ERP restent.')) return;
    clearManualDraft();
    setManual({});
    toast.success('Brouillon manuel réinitialisé');
  }, []);

  const handleExport = useCallback(async () => {
    try {
      setSaving(true);
      const { filename } = exportPdf(note);
      const documentPayload = {
        title: `Note descriptive DER/FJ — ${note.identificationProjet?.nom || 'Horizon Farm'}`,
        document_category: 'note_descriptive_derfj',
        module_source: 'investisseurs_forums',
        entity_type: 'business_plan',
        entity_id: 'horizon_farm_derfj',
        status: 'genere',
        financeur: 'DER/FJ',
        completeness_score: completeness.score,
        generated_at: new Date().toISOString(),
        filename,
      };
      await onCreateDocument?.(documentPayload);
      await onCreateBusinessEvent?.({
        event_type: 'note_descriptive_derfj_generee',
        module_source: 'investisseurs_forums',
        entity_type: 'business_plan',
        entity_id: 'horizon_farm_derfj',
        title: 'Note descriptive DER/FJ générée',
        description: `Complétude : ${completeness.score}/100. Sections manquantes : ${completeness.missing.length}.`,
        severity: 'info',
        event_date: new Date().toISOString().slice(0, 10),
      });
      await Promise.allSettled([onRefreshDocuments?.(), onRefreshBusinessEvents?.()]);
      toast.success(`Note descriptive générée · complétude ${completeness.score}/100`);
    } catch (error) {
      toast.error(error.message || 'Génération PDF impossible');
    } finally {
      setSaving(false);
    }
  }, [note, completeness, onCreateDocument, onCreateBusinessEvent, onRefreshDocuments, onRefreshBusinessEvents]);

  const sections = renderDerfjNoteSections(note);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-black text-emerald-800">
              <Sparkles size={14} /> DER/FJ Greenpreneurs
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Note descriptive du projet</h2>
            <p className="mt-2 text-sm text-slate-700 max-w-3xl">
              Générée automatiquement depuis l'ERP + BP officiel Horizon Farm.
              Personnalisez les champs manquants (CIN, téléphone, dates…) puis exportez le PDF conforme au format DER/FJ.
            </p>
          </div>
          <div className="flex flex-col gap-3 min-w-[260px]">
            <div className="rounded-2xl border border-emerald-300 bg-white p-4">
              <p className="text-xs font-black uppercase text-emerald-900">Complétude</p>
              <p className="text-3xl font-black text-slate-900">{completeness.score}/100</p>
              <p className="text-xs font-bold text-emerald-800">{completeness.ok}/{completeness.total} sections OK</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white"
              >
                <Pencil size={13} /> {editing ? 'Masquer édition' : 'Modifier les champs'}
              </button>
              <button
                type="button"
                onClick={resetDraft}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700"
              >
                <RotateCcw size={13} /> Réinitialiser
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white disabled:opacity-60"
              >
                <Download size={13} /> {saving ? 'Génération…' : 'Générer PDF DER/FJ'}
              </button>
            </div>
          </div>
        </div>

        {completeness.missing.length ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-black">
              <ShieldAlert size={14} /> {completeness.missing.length} élément(s) à compléter avant soumission :
            </p>
            <ul className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
              {completeness.missing.map((label) => (
                <li key={label} className="text-xs">• {label}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="flex items-center gap-2 font-black">
              <CheckCircle2 size={14} /> Note descriptive complète — prête à soumettre à DER/FJ.
            </p>
          </div>
        )}
      </section>

      {editing ? (
        <>
          <Section icon={FileText} title="I. Identification du promoteur" subtitle="Renseignez la CIN, téléphone, email et date de naissance — obligatoires pour DER/FJ.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {PROMOTEUR_FIELDS.map((field) => (
                <FieldInput
                  key={field.key}
                  label={field.label}
                  value={(manual.promoteur || {})[field.key] ?? note.identificationPromoteur?.[field.key]}
                  onChange={(value) => patchPromoteur({ [field.key]: value })}
                  type={field.type}
                />
              ))}
            </div>
          </Section>

          <Section icon={FileText} title="II. Identification du projet" subtitle="Adresse précise et statut juridique.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {PROJET_FIELDS.map((field) => (
                <FieldInput
                  key={field.key}
                  label={field.label}
                  value={(manual.projet || {})[field.key] ?? note.identificationProjet?.[field.key]}
                  onChange={(value) => patchProjet({ [field.key]: value })}
                />
              ))}
            </div>
          </Section>

          <Section icon={FileText} title="III. Genèse, IV. Objectifs, XV. Conclusion" subtitle="Textes libres — personnalisez pour raconter votre histoire.">
            <FieldInput
              label="Genèse et justification du projet"
              value={manual.genese ?? note.genese}
              onChange={(value) => patchManual({ genese: value })}
              textarea
              rows={6}
            />
            <FieldInput
              label="Objectif général"
              value={manual.objectifs?.general ?? note.objectifs?.general}
              onChange={(value) => patchManual({ objectifs: { ...(manual.objectifs || {}), general: value } })}
              textarea
              rows={3}
            />
            <ListEditor
              label="Objectifs spécifiques (SMART) — une ligne chacun"
              value={manual.objectifs?.specifiques ?? note.objectifs?.specifiques}
              onChange={(value) => patchManual({ objectifs: { ...(manual.objectifs || {}), specifiques: value } })}
              rows={6}
            />
            <FieldInput
              label="Conclusion et engagement"
              value={manual.conclusion ?? note.conclusion}
              onChange={(value) => patchManual({ conclusion: value })}
              textarea
              rows={5}
            />
          </Section>
        </>
      ) : null}

      <Section icon={FileText} title="Aperçu narratif complet" subtitle="Le contenu ci-dessous sera exporté tel quel dans le PDF DER/FJ.">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {sections.map((section) => (
            <div key={section.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="font-black text-slate-900">{section.title}</p>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700 font-sans">{section.body || '—'}</pre>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Save} title="Rappel">
        <p className="text-sm text-slate-700">
          Le brouillon manuel est sauvegardé automatiquement dans ce navigateur. Le PDF exporté crée aussi un document dans <b>Documents & Rapports</b> (catégorie <code className="rounded bg-slate-100 px-1">note_descriptive_derfj</code>) et un événement métier de traçabilité.
        </p>
      </Section>
    </div>
  );
}
