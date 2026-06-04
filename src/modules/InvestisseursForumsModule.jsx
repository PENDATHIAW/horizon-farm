import { useMemo, useState } from 'react';
import {
  Bot, Briefcase, Building2, Download, FileText, Handshake, Heart, Landmark,
  Lightbulb, ShieldAlert, Sparkles, Target, TrendingUp, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import { buildInvestorForumProfile, HORIZON_FARM_TAGLINE } from '../services/investorForums/investorProfileService.js';
import { computeForumReadinessScore } from '../services/investorForums/forumReadinessScore.js';
import { adaptProfileForAudience, FORUM_AUDIENCES } from '../services/investorForums/forumAudienceAdapter.js';
import { buildForumPack, exportForumPackPdf, FORUM_PACK_TYPES } from '../services/investorForums/forumPackBuilder.js';
import { fmtCurrency } from '../utils/format.js';

const SECTIONS = [
  { id: 'project', label: 'Résumé du projet', icon: Target },
  { id: 'founder', label: 'Profil fondatrice', icon: Users },
  { id: 'activities', label: 'Activités', icon: Briefcase },
  { id: 'figures', label: 'Chiffres clés', icon: TrendingUp },
  { id: 'impact', label: 'Impact social', icon: Heart },
  { id: 'ai', label: 'Innovation IA', icon: Bot },
  { id: 'needs', label: 'Besoins recherchés', icon: Lightbulb },
  { id: 'risks', label: 'Risques & mitigation', icon: ShieldAlert },
  { id: 'score', label: 'Score préparation', icon: Sparkles },
  { id: 'export', label: 'Génération dossier', icon: Download },
];

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-xs font-bold border whitespace-nowrap ${active ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#7d6a4a] border-[#d6c3a0]'}`}
    >
      {children}
    </button>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <p className="flex items-center gap-2 font-black text-[#2f2415]">
        {Icon ? <Icon size={18} /> : null}
        {title}
      </p>
      <div className="mt-3 space-y-2 text-sm text-[#7d6a4a]">{children}</div>
    </div>
  );
}

function StatMini({ label, value }) {
  return (
    <div className="rounded-xl border border-[#eadcc2] bg-white p-3">
      <p className="text-[10px] uppercase tracking-widest font-black text-[#8a7456]">{label}</p>
      <p className="mt-1 font-black text-[#2f2415] break-words">{value}</p>
    </div>
  );
}

function audienceIcon(id) {
  if (id === 'banque') return Landmark;
  if (id === 'ong_subvention' || id === 'femmes_entrepreneures') return Heart;
  if (id === 'salon_agricole') return Sparkles;
  if (id === 'partenaire_technique') return Building2;
  return Briefcase;
}

export default function InvestisseursForumsModule(props) {
  const [tab, setTab] = useState('project');
  const [audienceKey, setAudienceKey] = useState('investisseur_prive');
  const [exportBusy, setExportBusy] = useState(null);

  const profile = useMemo(
    () => buildInvestorForumProfile({
      crud: props.crud || {},
      dataMap: props.dataMap || props,
      liveMeteo: props.meteo || props.liveMeteo || null,
    }),
    [props],
  );

  const readiness = useMemo(() => computeForumReadinessScore(profile), [profile]);
  const adapted = useMemo(() => adaptProfileForAudience(profile, audienceKey), [profile, audienceKey]);

  const exportPack = async (packType) => {
    setExportBusy(packType);
    try {
      const pack = buildForumPack(profile, { audienceKey, packType });
      exportForumPackPdf(pack);
      await props.onCreateDocument?.({
        title: pack.title,
        document_category: 'dossier_forum',
        module_source: 'investisseurs_forums',
        status: 'genere',
        generated_at: new Date().toISOString(),
      });
      await props.onRefreshDocuments?.();
      toast.success(`${pack.packType.label} exporté`);
    } catch (error) {
      toast.error(error.message || 'Export impossible');
    } finally {
      setExportBusy(null);
    }
  };

  const k = profile.keyFigures || {};
  const AudienceIcon = audienceIcon(audienceKey);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black flex items-center gap-2">
              <Handshake size={16} />
              Investisseurs & Forums
            </p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Dossier présentable Horizon Farm</h1>
            <p className="mt-2 text-sm text-[#8a7456] max-w-3xl italic">{HORIZON_FARM_TAGLINE}</p>
            <p className="mt-1 text-sm text-[#8a7456] max-w-3xl">
              Présente et adapte les données réelles ERP pour investisseurs, banques, ONG, salons et partenaires — sans recalculer Finance ni Rapports.
            </p>
            {props.periodLabel ? (
              <div className="mt-2">
                <PeriodScopeBadge label={props.periodLabel} />
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 min-w-[200px]">
            <p className="text-xs font-black text-emerald-800">Score de préparation</p>
            <p className="text-3xl font-black text-[#2f2415]">{readiness.score}/100</p>
            <p className="text-xs text-emerald-800">{readiness.label}</p>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-[#eadcc2] bg-white p-4 space-y-3">
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
        <p className="text-sm text-[#7d6a4a]">
          <b>Angle :</b> {adapted.audience.angle}
        </p>
        <p className="text-sm text-[#2f2415] rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
          {adapted.executiveSummary}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((section) => (
          <TabButton key={section.id} active={tab === section.id} onClick={() => setTab(section.id)}>
            {section.label}
          </TabButton>
        ))}
      </div>

      {tab === 'project' && (
        <Panel title="Résumé du projet" icon={Target}>
          <p className="font-black text-[#2f2415]">{profile.projectSummary?.title}</p>
          <p className="mt-2">{profile.projectSummary?.pitch}</p>
          <p className="mt-2"><b>Statut juridique :</b> {profile.projectSummary?.legalStatus}</p>
          <p className="mt-1"><b>Localisation :</b> {profile.projectSummary?.location}</p>
          <ul className="mt-3 list-disc pl-5 space-y-1">
            {(profile.projectSummary?.activities || []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Panel>
      )}

      {tab === 'founder' && (
        <Panel title="Profil fondatrice" icon={Users}>
          <p className="text-xl font-black text-[#2f2415]">{profile.founderProfile?.name}</p>
          <p className="mt-1">{profile.founderProfile?.role}</p>
          <ul className="mt-3 space-y-2">
            {(profile.founderProfile?.highlights || []).map((item) => (
              <li key={item} className="rounded-xl border border-[#eadcc2] bg-white p-3">{item}</li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === 'activities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(profile.activities || []).map((act) => (
            <div key={act.id} className={`rounded-2xl border p-4 ${act.status === 'actif' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className="font-black text-[#2f2415]">{act.label}</p>
              <p className="text-xs mt-1 uppercase font-black">{act.status === 'actif' ? 'Actif ERP' : 'Planifié BP'}</p>
              <p className="mt-2 text-sm">{act.detail}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'figures' && (
        <div className="space-y-4">
          <p className="text-sm text-[#8a7456]">Chiffres lus depuis Hey Horizon AI Core — pas de recalcul Finance parallèle.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatMini label="CA ERP" value={fmtCurrency(k.ca_erp)} />
            <StatMini label="Encaissements" value={fmtCurrency(k.encaissements)} />
            <StatMini label="Trésorerie" value={fmtCurrency(k.resultat_tresorerie)} />
            <StatMini label="Créances" value={fmtCurrency(k.creances)} />
            <StatMini label="Valeur stock" value={fmtCurrency(k.valeur_stock)} />
            <StatMini label="CA BP annuel" value={fmtCurrency(k.ca_bp_annuel)} />
            <StatMini label="Besoin BP" value={fmtCurrency(k.besoin_bp)} />
            <StatMini label="Score santé ERP" value={`${k.health_score || 0}/100`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {adapted.highlights.map((h) => (
              <StatMini key={h.label} label={h.label} value={h.value} />
            ))}
          </div>
        </div>
      )}

      {tab === 'impact' && (
        <Panel title="Impact social" icon={Heart}>
          <p><b>Sécurité alimentaire :</b> {profile.socialImpact?.securite_alimentaire}</p>
          <p className="mt-2"><b>Emplois prévus BP :</b> {profile.socialImpact?.emplois_prevus}</p>
          <p className="mt-2"><b>Femmes & jeunes :</b> {profile.socialImpact?.femmes_jeunes}</p>
          <p className="mt-2"><b>Formalisation :</b> {profile.socialImpact?.formalisation}</p>
          <p className="mt-2"><b>Communauté :</b> {profile.socialImpact?.community}</p>
        </Panel>
      )}

      {tab === 'ai' && (
        <Panel title="Innovation IA" icon={Bot}>
          <p className="font-black text-[#2f2415]">{profile.aiInnovation?.headline}</p>
          <p className="mt-2">{profile.aiInnovation?.differentiator}</p>
          <ul className="mt-3 list-disc pl-5 space-y-1">
            {(profile.aiInnovation?.modules || []).map((m) => <li key={m}>{m}</li>)}
          </ul>
        </Panel>
      )}

      {tab === 'needs' && (
        <div className="space-y-2">
          {(profile.needsSought || []).map((need) => (
            <div key={need.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 flex justify-between gap-3">
              <div>
                <p className="font-black text-[#2f2415]">{need.label}</p>
                <p className="text-sm mt-1">{need.detail}</p>
              </div>
              <span className="text-[10px] font-black uppercase shrink-0">{need.priority}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'risks' && (
        <div className="space-y-2">
          {adapted.adaptedRisks.map((risk) => (
            <div key={risk.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="font-black text-[#2f2415]">{risk.label}</p>
              <p className="text-sm mt-1">{risk.detail}</p>
              <p className="text-sm mt-2 text-emerald-800"><b>Mitigation :</b> {risk.mitigation}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'score' && (
        <div className="space-y-4">
          <Panel title="Score de préparation forum" icon={Sparkles}>
            <p className="text-2xl font-black text-[#2f2415]">{readiness.score}/100 — {readiness.label}</p>
            <p className="mt-2">{readiness.summary}</p>
            <p className="mt-2 text-xs">Base investisseur Core : {readiness.base_investor_score}/100 · Checklist : {readiness.checklist_score}/100</p>
          </Panel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {readiness.checklist.map((item) => (
              <div key={item.id} className={`rounded-xl border p-3 text-sm ${item.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className="font-black">{item.ok ? '✓' : '○'} {item.label}</p>
              </div>
            ))}
          </div>
          {readiness.missing.length ? (
            <p className="text-sm text-amber-800"><b>À compléter :</b> {readiness.missing.join(' · ')}</p>
          ) : null}
        </div>
      )}

      {tab === 'export' && (
        <div className="space-y-4">
          <Panel title="Génération dossier" icon={FileText}>
            <p>Exports PDF — réutilise l&apos;architecture Rapports module pour rapports impact/financier ; dossiers multi-sections pour investisseur et subvention.</p>
            <p className="mt-2 text-xs text-[#8a7456]">Cible active : {adapted.audience.label}</p>
          </Panel>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(FORUM_PACK_TYPES).map((pack) => (
              <button
                key={pack.id}
                type="button"
                disabled={exportBusy === pack.id}
                onClick={() => exportPack(pack.id)}
                className="rounded-2xl border border-[#d6c3a0] bg-white p-4 text-left hover:border-[#2f2415] disabled:opacity-60"
              >
                <Download size={18} className="text-[#2f2415]" />
                <p className="mt-2 font-black text-[#2f2415]">{pack.label}</p>
                <p className="text-xs text-[#8a7456] mt-1">PDF · {adapted.audience.label}</p>
              </button>
            ))}
          </div>
          <p className="text-sm text-[#8a7456]">{adapted.callToAction}</p>
        </div>
      )}
    </div>
  );
}
