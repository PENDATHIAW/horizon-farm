import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot, Briefcase, Building2, CheckCircle2, Download, Eye, FileText, FolderOpen, Handshake, Heart,
  History, Landmark, LayoutDashboard, Lightbulb, Pencil, Play, Route, Save, ShieldAlert, Sparkles, Target, Trash2,
  TrendingUp, Users, X, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import { resolveInvestisseursTab } from '../utils/commercialNavigation.js';
import { buildInvestorForumProfile, HORIZON_FARM_TAGLINE } from '../services/investorForums/investorProfileService.js';
import { computeForumReadinessScore } from '../services/investorForums/forumReadinessScore.js';
import { adaptProfileForAudience, FORUM_AUDIENCES } from '../services/investorForums/forumAudienceAdapter.js';
import {
  buildForumPack, downloadForumPackPdf, FORUM_PACK_TYPES, renderForumPackPdfBlob,
} from '../services/investorForums/forumPackBuilder.js';
import {
  deleteInvestorForumExport,
  listInvestorForumExports,
  loadInvestorForumProfile,
  readExportBlob,
  saveInvestorForumExport,
  saveInvestorForumProfile,
} from '../services/investorForums/investorForumStorageService.js';
import {
  EMPTY_MANUAL_CONTENT,
  manualContentFromRow,
  mergeInvestorForumProfile,
} from '../services/investorForums/mergeInvestorForumProfile.js';
import { fmtCurrency } from '../utils/format.js';
import GreenpreneursReadinessCard from '../components/greenpreneurs/GreenpreneursReadinessCard.jsx';
import { isSimulatedDataModeEnabled } from '../utils/uiPreferences.js';
import InvestisseurDemoPanel from './InvestisseurDemoPanel.jsx';
import InvestorDossierLibrary from '../components/investorForums/InvestorDossierLibrary.jsx';
import InvestorCrmPanel from '../components/investorForums/InvestorCrmPanel.jsx';
import DerfjNoteDescriptiveTab from '../components/investorForums/DerfjNoteDescriptiveTab.jsx';
import {
  InvestorFounderSection,
  InvestorKpiSection,
  InvestorObjectivesSection,
  InvestorRoomHero,
  InvestorScoreSection,
  InvestorSeekingSection,
  InvestorTimelineSection,
  InvestorVisionMissionSection,
  InvestorWhyInvestSection,
} from '../components/investorForums/InvestorRoomPanels.jsx';
import { applyInvestorRoomDefaults } from '../services/investorForums/investorRoomDefaults.js';

const MAIN_TABS = [
  { id: 'room', label: 'Investor Room', icon: LayoutDashboard },
  { id: 'preparation', label: 'Préparation', icon: CheckCircle2 },
  { id: 'derfj_note', label: 'Note DER/FJ', icon: ShieldAlert },
  { id: 'dossier', label: 'Dossier', icon: FileText },
  { id: 'library', label: 'Data Room', icon: FolderOpen },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'preview', label: 'Aperçu dossier', icon: Eye },
  { id: 'export', label: 'Exports PDF', icon: Download },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'demo', label: 'Démo investisseur', icon: Sparkles },
];

const DOSSIER_SECTIONS = [
  { id: 'project', label: 'Résumé', icon: Target },
  { id: 'vision', label: 'Vision & mission', icon: Sparkles },
  { id: 'founder', label: 'Fondatrice', icon: Users },
  { id: 'figures', label: 'Chiffres', icon: TrendingUp },
  { id: 'impact', label: 'Impact', icon: Heart },
  { id: 'needs', label: 'Besoins', icon: Lightbulb },
  { id: 'risks', label: 'Risques', icon: ShieldAlert },
  { id: 'ai', label: 'Innovation IA', icon: Bot },
  { id: 'objectives', label: 'Objectifs', icon: Target },
];

const AUDIENCE_ICONS = {
  banque: Landmark,
  ong_subvention: Heart,
  femmes_entrepreneures: Heart,
  salon_agricole: Sparkles,
  partenaire_technique: Building2,
  default: Briefcase,
};

const DOSSIER_STATUS_OPTIONS = [
  { id: 'brouillon', label: 'Brouillon' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'pret', label: 'Prêt' },
];

function StatusBadge({ badge, tone }) {
  const cls = tone === 'ready'
    ? 'bg-emerald-600 text-white border-emerald-700'
    : tone === 'progress'
      ? 'bg-amber-500 text-white border-amber-600'
      : 'bg-[#8a7456] text-white border-[#6d5a42]';
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${cls}`}>
      {badge}
    </span>
  );
}

function ProgressBar({ percent }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] font-black text-[#8a7456] mb-1">
        <span>Progression dossier</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#eadcc2]/60 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[#2f2415] to-emerald-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick, Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border whitespace-nowrap transition-colors ${active ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#7d6a4a] border-[#d6c3a0] hover:border-[#2f2415]/40'}`}
    >
      {Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}

function Card({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 shadow-sm ${className}`}>
      <p className="flex items-center gap-2 font-black text-[#2f2415]">
        {Icon ? <Icon size={18} /> : null}
        {title}
      </p>
      <div className="mt-3 space-y-2 text-sm text-[#7d6a4a]">{children}</div>
    </div>
  );
}

function StatMini({ label, value, auto }) {
  return (
    <div className="rounded-xl border border-[#eadcc2] bg-white p-3">
      <p className="text-[10px] uppercase tracking-widest font-black text-[#8a7456] flex items-center justify-between gap-2">
        <span>{label}</span>
        {auto ? <span className="text-[9px] text-emerald-700 font-bold">ERP</span> : null}
      </p>
      <p className="mt-1 font-black text-[#2f2415] break-words">{value}</p>
    </div>
  );
}

function Field({ label, value, editing, onChange, rows = 3, hint }) {
  if (!editing) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-widest font-black text-[#8a7456]">{label}</p>
        <p className="mt-1 whitespace-pre-wrap">{value || '—'}</p>
      </div>
    );
  }
  const Tag = rows > 1 ? 'textarea' : 'input';
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest font-black text-[#8a7456]">{label}</span>
      {hint ? <span className="block text-[10px] text-[#a08a6a] mt-0.5">{hint}</span> : null}
      <Tag
        className="mt-1 w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] focus:border-[#2f2415] focus:outline-none"
        rows={rows > 1 ? rows : undefined}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function PreviewSection({ section }) {
  return (
    <div className="rounded-xl border border-[#eadcc2] bg-white p-4">
      <p className="font-black text-[#2f2415]">{section.title}</p>
      <p className="mt-2 text-sm text-[#7d6a4a] whitespace-pre-wrap">{section.body}</p>
    </div>
  );
}

export default function InvestisseursForumsModule(props) {
  const controlled = Boolean(props.onTabChange);
  const [internalTab, setInternalTab] = useState(() => resolveInvestisseursTab(props.initialTab));
  const mainTab = controlled ? resolveInvestisseursTab(props.initialTab) : internalTab;
  const setMainTab = useCallback((value) => {
    const resolved = resolveInvestisseursTab(value);
    const raw = String(value || '').trim();
    if (controlled) props.onTabChange?.(raw || resolved);
    else setInternalTab(resolved);
  }, [controlled, props.onTabChange]);

  useEffect(() => {
    if (!props.initialTab) return;
    if (!controlled) setInternalTab(resolveInvestisseursTab(props.initialTab));
  }, [controlled, props.initialTab]);
  const [dossierSection, setDossierSection] = useState('project');
  const [audienceKey, setAudienceKey] = useState('investisseur_prive');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportBusy, setExportBusy] = useState(null);
  const [previewPackType, setPreviewPackType] = useState('fiche_projet');
  const [profileRow, setProfileRow] = useState(null);
  const [manualDraft, setManualDraft] = useState({ ...EMPTY_MANUAL_CONTENT });
  const [exportHistory, setExportHistory] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dossierFileCount, setDossierFileCount] = useState(0);
  const [demoCompleted, setDemoCompleted] = useState(false);

  const autoProfile = useMemo(
    () => buildInvestorForumProfile({
      crud: props.crud || {},
      dataMap: props.dataMap || props,
      liveMeteo: props.meteo || props.liveMeteo || null,
    }),
    [props],
  );

  const profile = useMemo(
    () => mergeInvestorForumProfile(autoProfile, manualDraft),
    [autoProfile, manualDraft],
  );

  const readiness = useMemo(
    () => computeForumReadinessScore(profile, {
      exportCount: exportHistory.length,
      dossierFileCount,
      demoCompleted,
    }),
    [profile, exportHistory.length, dossierFileCount, demoCompleted],
  );

  const adapted = useMemo(
    () => adaptProfileForAudience(profile, audienceKey),
    [profile, audienceKey],
  );

  const previewPack = useMemo(
    () => buildForumPack(profile, { audienceKey, packType: previewPackType }),
    [profile, audienceKey, previewPackType],
  );

  const loadStorage = useCallback(async () => {
    const row = await loadInvestorForumProfile();
    setProfileRow(row);
    setManualDraft(applyInvestorRoomDefaults(manualContentFromRow(row)));
    const history = await listInvestorForumExports();
    setExportHistory(history);
  }, []);

  useEffect(() => { loadStorage(); }, [loadStorage]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const patchManual = (patch) => setManualDraft((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const row = await saveInvestorForumProfile(manualDraft, manualDraft.dossier_status);
      setProfileRow(row);
      setManualDraft(manualContentFromRow(row));
      setEditing(false);
      toast.success('Dossier enregistré');
    } catch (error) {
      toast.error(error.message || 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const runExport = async (packType, { download = true, saveToDocuments = false, preview = false } = {}) => {
    setExportBusy(packType);
    try {
      const pack = buildForumPack(profile, { audienceKey, packType });
      const { blob, filename } = renderForumPackPdfBlob(pack);

      if (preview) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        window.open(url, '_blank', 'noopener');
        setMainTab('preview');
        setPreviewPackType(packType);
      }

      if (download) downloadForumPackPdf(pack);

      const saved = await saveInvestorForumExport({
        packType,
        audienceKey,
        documentTitle: pack.title,
        filename,
        blob,
      });
      setExportHistory((prev) => [saved, ...prev.filter((e) => e.id !== saved.id)].slice(0, 50));

      if (saveToDocuments && props.onCreateDocument) {
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        await props.onCreateDocument({
          title: pack.title,
          document_category: 'dossier_forum',
          module_source: 'investisseurs_forums',
          status: 'genere',
          file_url: typeof dataUrl === 'string' && dataUrl.length < 500000 ? dataUrl : undefined,
          notes: `Export ${packType} · ${adapted.audience.label} · ${filename}`,
          generated_at: new Date().toISOString(),
        });
        await props.onRefreshDocuments?.();
        toast.success('Enregistré dans Documents & Rapports');
      } else if (download) {
        toast.success(`${pack.packType.label} généré`);
      }
    } catch (error) {
      toast.error(error.message || 'Export impossible');
    } finally {
      setExportBusy(null);
    }
  };

  const handleScoreAction = (action = {}) => {
    if (action.navigate) {
      props.onNavigate?.(action.navigate);
      return;
    }
    if (action.tab) setMainTab(action.tab);
    if (action.section) setDossierSection(action.section);
    if (action.edit) setEditing(true);
  };

  const generateMonDossier = () => runExport('dossier_investisseur', { download: true });

  const prepareDemo = () => setMainTab('demo');

  const downloadHistoryItem = (item) => {
    const data = readExportBlob(item.id);
    if (!data) {
      toast.error('Fichier introuvable — regénérez le document');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = data;
    anchor.download = item.filename || 'export.pdf';
    anchor.click();
  };

  const k = profile.keyFigures || {};
  const AudienceIcon = AUDIENCE_ICONS[audienceKey] || AUDIENCE_ICONS.default;
  const audienceMessage = manualDraft.audience_messages?.[audienceKey] ?? '';

  return (
    <div className="space-y-6 pb-8 bg-gradient-to-b from-slate-50/80 to-white min-h-full">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-teal-700 font-black flex items-center gap-2">
              <Handshake size={16} />
              Investisseurs & Forums
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Investor Room · Data Room professionnelle</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge badge={readiness.badge} tone={readiness.badge_tone} />
            </div>
            <p className="mt-2 text-sm text-slate-600 max-w-3xl">{HORIZON_FARM_TAGLINE}</p>
            <p className="mt-1 text-sm text-slate-500 max-w-3xl">
              Convaincre investisseurs, banques, ONG, incubateurs et forums — chiffres ERP + contenus éditables + exports PDF.
            </p>
            {props.periodLabel ? (
              <div className="mt-2">
                <PeriodScopeBadge label={props.periodLabel} />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 min-w-[140px]">
              <p className="text-xs font-black text-emerald-800">Score préparation</p>
              <p className="text-3xl font-black text-[#2f2415]">{readiness.score}/100</p>
              <p className="text-xs text-emerald-800">{readiness.label}</p>
            </div>
            <div className="rounded-2xl border border-[#eadcc2] bg-white p-4 min-w-[140px]">
              <p className="text-xs font-black text-[#8a7456]">Statut dossier</p>
              <p className="text-lg font-black text-[#2f2415]">{readiness.dossier_status_label}</p>
              {editing ? (
                <select
                  className="mt-2 w-full rounded-lg border border-[#d6c3a0] text-xs"
                  value={manualDraft.dossier_status}
                  onChange={(e) => patchManual({ dossier_status: e.target.value })}
                >
                  {DOSSIER_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 max-w-xl">
          <ProgressBar percent={readiness.progress_percent} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(exportBusy)}
            onClick={generateMonDossier}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white shadow-md disabled:opacity-60"
          >
            <Download size={16} />
            Générer mon dossier
          </button>
          <button
            type="button"
            onClick={prepareDemo}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-violet-300 bg-violet-50 px-5 py-2.5 text-sm font-black text-violet-900"
          >
            <Play size={16} />
            Préparer une démo investisseur
          </button>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-bold text-white"
            >
              <Pencil size={14} />
              Modifier
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                <Save size={14} />
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualDraft(manualContentFromRow(profileRow));
                  setEditing(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-2 text-xs font-bold text-[#7d6a4a]"
              >
                <X size={14} />
                Annuler
              </button>
            </>
          )}
        </div>
      </section>

      <div className="rounded-2xl border border-[#eadcc2] bg-white p-4 space-y-3 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-[#8a7456] flex items-center gap-2">
          <AudienceIcon size={14} />
          Adapter selon la cible
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.values(FORUM_AUDIENCES).map((aud) => (
            <button
              key={aud.id}
              type="button"
              onClick={() => setAudienceKey(aud.id)}
              className={`rounded-xl px-3 py-2 text-xs font-bold border ${audienceKey === aud.id ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-[#fffdf8] text-[#7d6a4a] border-[#d6c3a0]'}`}
            >
              {aud.label}
            </button>
          ))}
        </div>
        {editing ? (
          <Field
            label="Texte personnalisé pour cette cible"
            value={audienceMessage}
            editing
            rows={3}
            hint="Remplace le résumé exécutif automatique pour l'export PDF de cette cible."
            onChange={(value) => patchManual({
              audience_messages: { ...manualDraft.audience_messages, [audienceKey]: value },
            })}
          />
        ) : (
          <>
            <p className="text-sm text-[#7d6a4a]"><b>Angle :</b> {adapted.audience.angle}</p>
            <p className="text-sm text-[#2f2415] rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              {adapted.executiveSummary}
            </p>
          </>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 sticky top-0 z-10 bg-gradient-to-b from-slate-50/95 to-transparent py-2">
        {MAIN_TABS.map((tab) => (
          <TabButton
            key={tab.id}
            active={mainTab === tab.id}
            onClick={() => setMainTab(tab.id)}
            Icon={tab.icon}
          >
            {tab.label}
          </TabButton>
        ))}
      </div>

      {mainTab === 'room' && (
        <div className="space-y-6">
          <InvestorRoomHero
            profile={profile}
            readiness={readiness}
            dossierFileCount={dossierFileCount}
            exportCount={exportHistory.length}
            editing={editing}
            manualDraft={manualDraft}
            onPatch={patchManual}
          />
          <InvestorScoreSection readiness={readiness} onAction={handleScoreAction} />
          <InvestorFounderSection profile={profile} editing={editing} manualDraft={manualDraft} onPatch={patchManual} />
          <InvestorVisionMissionSection profile={profile} editing={editing} manualDraft={manualDraft} onPatch={patchManual} />
          <InvestorWhyInvestSection profile={profile} editing={editing} manualDraft={manualDraft} onPatch={patchManual} />
          <InvestorSeekingSection profile={profile} editing={editing} manualDraft={manualDraft} onPatch={patchManual} />
          <InvestorObjectivesSection profile={profile} editing={editing} manualDraft={manualDraft} onPatch={patchManual} />
          <InvestorKpiSection profile={profile} readiness={readiness} />
          <InvestorTimelineSection profile={profile} editing={editing} manualDraft={manualDraft} onPatch={patchManual} />
        </div>
      )}

      {mainTab === 'crm' && <InvestorCrmPanel />}

      {mainTab === 'preparation' && (
        <div className="space-y-4">
          <GreenpreneursReadinessCard
            dataMap={props.dataMap || props}
            simulatedMode={isSimulatedDataModeEnabled()}
            onNavigate={props.onNavigate}
          />
          <Card title="Feuille de route progressive" icon={Route} className="border-emerald-200 bg-emerald-50/40">
            <p className="text-sm text-[#2f2415]">
              Horizon Farm dispose d&apos;une feuille de route progressive. Les phases futures de valorisation des coproduits bovins
              (Tallow &amp; Go, BOVINIA) seront décidées à partir des données ERP, et non sur simple intuition.
            </p>
          </Card>
          <Card title={`Pourquoi ${readiness.score}/100 ?`} icon={Sparkles} className="border-[#d6c3a0]">
            <p className="text-sm">{readiness.explanation}</p>
            <p className="mt-2 text-sm">{readiness.summary}</p>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-black uppercase text-emerald-800 mb-2">Éléments remplis</p>
                <div className="space-y-1">
                  {readiness.breakdown.filled.slice(0, 8).map((item) => (
                    <p key={`${item.id}-${item.label}`} className="text-xs text-emerald-900">✓ {item.label}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-amber-800 mb-2">Éléments manquants & actions</p>
                <div className="space-y-2">
                  {readiness.recommended_actions.map((action) => (
                    <div key={action.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-[#2f2415]">{action.label}</p>
                        <p className="text-xs text-[#8a7456]">{action.hint}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleScoreAction(action)}
                        className="shrink-0 rounded-lg bg-[#2f2415] px-3 py-1.5 text-[10px] font-bold text-white"
                      >
                        Compléter
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Checklist de préparation" icon={CheckCircle2}>
            <p className="text-xs text-[#8a7456] mb-2">
              {readiness.prep_ok_count}/{readiness.prep_total} éléments complétés
            </p>
            <div className="space-y-2">
              {readiness.preparation.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 text-sm flex items-center justify-between gap-2 ${item.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
                >
                  <span><span className="font-black">{item.ok ? '✓' : '○'}</span> {item.label}</span>
                  {!item.ok && item.action ? (
                    <button type="button" onClick={() => handleScoreAction(item.action)} className="text-[10px] font-bold underline shrink-0">
                      Compléter
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {readiness.prep_missing.length ? (
              <p className="mt-3 text-sm text-amber-800">
                <b>À compléter :</b> {readiness.prep_missing.join(' · ')}
              </p>
            ) : null}
          </Card>
          <Card title="Score ERP & données auto" icon={Sparkles}>
            <p className="text-2xl font-black text-[#2f2415]">{readiness.score}/100 — {readiness.label}</p>
            <p className="mt-2">{readiness.summary}</p>
            <p className="mt-2 text-xs">
              Core {readiness.base_investor_score}/100 · Checklist ERP {readiness.checklist_score}/100
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {readiness.checklist.slice(0, 6).map((item) => (
                <div key={item.id} className={`text-xs rounded-lg px-2 py-1 ${item.ok ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {item.ok ? '✓' : '○'} {item.label}
                </div>
              ))}
            </div>
          </Card>
          </div>
        </div>
      )}

      {mainTab === 'library' && (
        <InvestorDossierLibrary
          erpDocuments={props.documents || []}
          onRefresh={(count) => setDossierFileCount(count)}
        />
      )}

      {mainTab === 'dossier' && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {DOSSIER_SECTIONS.map((s) => (
              <TabButton key={s.id} active={dossierSection === s.id} onClick={() => setDossierSection(s.id)} Icon={s.icon}>
                {s.label}
              </TabButton>
            ))}
          </div>

          {dossierSection === 'project' && (
            <Card title="Résumé du projet" icon={Target}>
              <Field label="Résumé / pitch" value={editing ? manualDraft.project_pitch : profile.projectSummary?.pitch} editing={editing} rows={4} onChange={(v) => patchManual({ project_pitch: v })} />
              <Field label="Localisation" value={editing ? manualDraft.location : profile.projectSummary?.location} editing={editing} rows={1} onChange={(v) => patchManual({ location: v })} />
              <Field label="Statut du projet" value={editing ? manualDraft.project_status : profile.projectSummary?.legalStatus} editing={editing} rows={1} onChange={(v) => patchManual({ project_status: v })} />
              <Field label="Activités (une par ligne)" value={editing ? manualDraft.activities_notes : (profile.projectSummary?.activities || []).join('\n')} editing={editing} rows={4} onChange={(v) => patchManual({ activities_notes: v })} />
            </Card>
          )}

          {dossierSection === 'vision' && (
            <Card title="Vision & mission" icon={Sparkles}>
              <Field label="Vision" value={editing ? manualDraft.vision : profile.projectSummary?.vision} editing={editing} rows={4} onChange={(v) => patchManual({ vision: v })} />
              <Field label="Mission" value={editing ? manualDraft.mission : profile.projectSummary?.mission} editing={editing} rows={4} onChange={(v) => patchManual({ mission: v })} />
            </Card>
          )}

          {dossierSection === 'founder' && (
            <Card title="Profil fondatrice" icon={Users}>
              <Field label="Nom" value={editing ? manualDraft.founder_name : profile.founderProfile?.name} editing={editing} rows={1} onChange={(v) => patchManual({ founder_name: v })} />
              <Field label="Rôle" value={editing ? manualDraft.founder_role : profile.founderProfile?.role} editing={editing} rows={1} onChange={(v) => patchManual({ founder_role: v })} />
              <Field label="Récit fondatrice" value={editing ? manualDraft.founder_story : profile.founderProfile?.story} editing={editing} rows={5} onChange={(v) => patchManual({ founder_story: v })} />
              <Field label="Points clés (une par ligne)" value={editing ? manualDraft.founder_highlights : (profile.founderProfile?.highlights || []).join('\n')} editing={editing} rows={5} onChange={(v) => patchManual({ founder_highlights: v })} />
            </Card>
          )}

          {dossierSection === 'figures' && (
            <div className="space-y-3">
              <p className="text-sm text-[#8a7456]">Chiffres en lecture seule — source Hey Horizon AI Core (pas de recalcul Finance).</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <StatMini label="CA ERP" value={fmtCurrency(k.ca_erp)} auto />
                <StatMini label="Encaissements" value={fmtCurrency(k.encaissements)} auto />
                <StatMini label="Trésorerie" value={fmtCurrency(k.resultat_tresorerie)} auto />
                <StatMini label="Créances" value={fmtCurrency(k.creances)} auto />
                <StatMini label="Valeur stock" value={fmtCurrency(k.valeur_stock)} auto />
                <StatMini label="CA BP annuel" value={fmtCurrency(k.ca_bp_annuel)} auto />
                <StatMini label="Besoin BP" value={fmtCurrency(k.besoin_bp)} auto />
                <StatMini label="Score santé" value={`${k.health_score || 0}/100`} auto />
              </div>
            </div>
          )}

          {dossierSection === 'impact' && (
            <Card title="Impact social" icon={Heart}>
              <Field label="Sécurité alimentaire" value={editing ? manualDraft.impact_securite : profile.socialImpact?.securite_alimentaire} editing={editing} rows={2} onChange={(v) => patchManual({ impact_securite: v })} />
              <Field label="Emplois" value={editing ? manualDraft.impact_emplois : String(profile.socialImpact?.emplois_prevus || '')} editing={editing} rows={1} onChange={(v) => patchManual({ impact_emplois: v })} />
              <Field label="Femmes & jeunes" value={editing ? manualDraft.impact_femmes : profile.socialImpact?.femmes_jeunes} editing={editing} rows={2} onChange={(v) => patchManual({ impact_femmes: v })} />
              <Field label="Formalisation" value={editing ? manualDraft.impact_formalisation : profile.socialImpact?.formalisation} editing={editing} rows={2} onChange={(v) => patchManual({ impact_formalisation: v })} />
              <Field label="Communauté" value={editing ? manualDraft.impact_community : profile.socialImpact?.community} editing={editing} rows={2} onChange={(v) => patchManual({ impact_community: v })} />
            </Card>
          )}

          {dossierSection === 'needs' && (
            <Card title="Besoins recherchés" icon={Lightbulb}>
              <Field label="Besoins (une ligne par besoin, option « label — détail »)" value={editing ? manualDraft.needs_notes : (profile.needsSought || []).map((n) => `${n.label} — ${n.detail}`).join('\n')} editing={editing} rows={6} onChange={(v) => patchManual({ needs_notes: v })} />
              {!editing && (
                <div className="mt-3 space-y-2">
                  {(profile.needsSought || []).map((need) => (
                    <div key={need.id} className="rounded-xl border border-[#eadcc2] bg-white p-3 flex justify-between gap-3">
                      <div>
                        <p className="font-black text-[#2f2415]">{need.label}</p>
                        <p className="text-sm mt-1">{need.detail}</p>
                      </div>
                      <span className="text-[10px] font-black uppercase shrink-0">{need.priority}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {dossierSection === 'risks' && (
            <Card title="Risques & mitigation" icon={ShieldAlert}>
              <Field label="Risques (format « risque → mitigation », une par ligne)" value={editing ? manualDraft.risks_notes : (profile.risksMitigation || []).map((r) => `${r.label} → ${r.mitigation}`).join('\n')} editing={editing} rows={6} onChange={(v) => patchManual({ risks_notes: v })} />
            </Card>
          )}

          {dossierSection === 'ai' && (
            <Card title="Innovation IA" icon={Bot}>
              <Field label="Titre / headline" value={editing ? manualDraft.ai_headline : profile.aiInnovation?.headline} editing={editing} rows={2} onChange={(v) => patchManual({ ai_headline: v })} />
              <Field label="Différenciateur" value={editing ? manualDraft.ai_differentiator : profile.aiInnovation?.differentiator} editing={editing} rows={3} onChange={(v) => patchManual({ ai_differentiator: v })} />
              <Field label="Modules IA (une par ligne)" value={editing ? manualDraft.ai_modules : (profile.aiInnovation?.modules || []).join('\n')} editing={editing} rows={5} onChange={(v) => patchManual({ ai_modules: v })} />
            </Card>
          )}

          {dossierSection === 'objectives' && (
            <Card title="Objectifs" icon={Target}>
              <Field label="6 mois" value={editing ? manualDraft.objectives_6m : profile.objectives?.sixMonths} editing={editing} rows={3} onChange={(v) => patchManual({ objectives_6m: v })} />
              <Field label="12 mois" value={editing ? manualDraft.objectives_12m : profile.objectives?.twelveMonths} editing={editing} rows={3} onChange={(v) => patchManual({ objectives_12m: v })} />
              <Field label="3 ans" value={editing ? manualDraft.objectives_3y : profile.objectives?.threeYears} editing={editing} rows={3} onChange={(v) => patchManual({ objectives_3y: v })} />
            </Card>
          )}
        </div>
      )}

      {mainTab === 'preview' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-black text-[#8a7456]">Type de document :</span>
            {Object.values(FORUM_PACK_TYPES).map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => setPreviewPackType(pack.id)}
                className={`rounded-lg px-2 py-1 text-xs font-bold border ${previewPackType === pack.id ? 'bg-[#2f2415] text-white' : 'bg-white border-[#d6c3a0]'}`}
              >
                {pack.label}
              </button>
            ))}
          </div>
          <Card title={`Aperçu — ${previewPack.title}`} icon={Eye}>
            <p className="text-xs text-[#8a7456]">Contenu exact exporté dans le PDF (cible : {adapted.audience.label})</p>
            <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {previewPack.sections.map((section) => (
                <PreviewSection key={section.title} section={section} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-bold text-white" onClick={() => runExport(previewPackType, { download: false, preview: true })}>
                Prévisualiser PDF
              </button>
              <button type="button" className="rounded-xl border border-[#d6c3a0] px-4 py-2 text-xs font-bold" onClick={() => runExport(previewPackType, { download: true })}>
                Télécharger
              </button>
            </div>
          </Card>
        </div>
      )}

      {mainTab === 'export' && (
        <div className="space-y-4">
          <Card title="Documents exportables" icon={FileText}>
            <p>Générez des PDF téléchargeables pour investisseurs, banques, ONG et forums. Les chiffres proviennent de l&apos;ERP ; les textes de votre dossier éditable.</p>
            <p className="mt-2 text-xs text-[#8a7456]">Cible active : {adapted.audience.label}</p>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(FORUM_PACK_TYPES).map((pack) => (
              <div key={pack.id} className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm flex flex-col">
                <Download size={18} className="text-[#2f2415]" />
                <p className="mt-2 font-black text-[#2f2415]">{pack.label}</p>
                <p className="text-xs text-[#8a7456] mt-1 flex-1">PDF · {adapted.audience.label}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" disabled={exportBusy === pack.id} onClick={() => runExport(pack.id, { download: true })} className="rounded-lg bg-[#2f2415] px-2 py-1.5 text-[10px] font-bold text-white disabled:opacity-60">
                    Générer PDF
                  </button>
                  <button type="button" disabled={exportBusy === pack.id} onClick={() => runExport(pack.id, { download: true })} className="rounded-lg border border-[#d6c3a0] px-2 py-1.5 text-[10px] font-bold disabled:opacity-60">
                    Télécharger
                  </button>
                  <button type="button" disabled={exportBusy === pack.id} onClick={() => runExport(pack.id, { download: true, saveToDocuments: true })} className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-[10px] font-bold text-emerald-900 disabled:opacity-60">
                    → Documents
                  </button>
                  <button type="button" disabled={exportBusy === pack.id} onClick={() => runExport(pack.id, { preview: true, download: false })} className="rounded-lg border border-[#d6c3a0] px-2 py-1.5 text-[10px] font-bold disabled:opacity-60">
                    Prévisualiser
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-[#8a7456]">{adapted.callToAction}</p>
        </div>
      )}

      {mainTab === 'history' && (
        <Card title="Historique des dossiers générés" icon={History}>
          {exportHistory.length === 0 ? (
            <p className="text-sm">Aucun export pour le moment. Générez un document depuis l&apos;onglet Documents exportables.</p>
          ) : (
            <div className="space-y-2">
              {exportHistory.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#eadcc2] bg-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-[#2f2415]">{item.document_title || item.filename}</p>
                    <p className="text-xs text-[#8a7456] mt-1">
                      {new Date(item.created_at).toLocaleString('fr-FR')} · {FORUM_AUDIENCES[item.audience_key]?.label || item.audience_key} · {FORUM_PACK_TYPES[item.pack_type]?.label || item.pack_type}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => downloadHistoryItem(item)} className="inline-flex items-center gap-1 rounded-lg border border-[#d6c3a0] px-3 py-1.5 text-xs font-bold">
                      <Download size={12} />
                      Télécharger
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteInvestorForumExport(item.id);
                        setExportHistory((prev) => prev.filter((e) => e.id !== item.id));
                        toast.success('Export supprimé');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800"
                    >
                      <Trash2 size={12} />
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {mainTab === 'derfj_note' && (
        <DerfjNoteDescriptiveTab
          data={{
            ...(props.dataMap || props),
            greenpreneurs: {
              readiness,
              circular: profile.circular,
              valorisation: profile.valorisation,
            },
          }}
          onCreateDocument={props.onCreateDocument}
          onRefreshDocuments={props.onRefreshDocuments}
          onCreateBusinessEvent={props.onCreateBusinessEvent}
          onRefreshBusinessEvents={props.onRefreshBusinessEvents}
        />
      )}

      {mainTab === 'demo' && (
        <InvestisseurDemoPanel onDemoProgress={(count) => setDemoCompleted(count >= 5)} />
      )}

      <div className="rounded-xl border border-dashed border-[#d6c3a0] bg-[#fffdf8]/80 p-3 text-xs text-[#8a7456] flex items-start gap-2">
        <Bot size={14} className="shrink-0 mt-0.5" />
        <span>
          Innovation IA : {profile.aiInnovation?.headline}. Les modules Finance, Rapports et Impact ne sont pas recalculés ici.
          {profileRow?.updated_at ? ` Dernière sauvegarde : ${new Date(profileRow.updated_at).toLocaleString('fr-FR')}.` : ''}
        </span>
      </div>
    </div>
  );
}
