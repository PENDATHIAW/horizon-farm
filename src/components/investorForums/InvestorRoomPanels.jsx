import { Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import { fmtCurrency } from '../../utils/format.js';
import {
  buildInvestorKpiItems,
  DEFAULT_SEEKING,
  DEFAULT_TIMELINE,
  DEFAULT_WHY_INVEST,
  HERO_PILLS,
  HORIZON_INVESTOR_ROOM_HERO_SUBTITLE,
  HORIZON_INVESTOR_ROOM_POSITIONING,
} from '../../services/investorForums/investorRoomDefaults.js';
import { FORUM_PACK_TYPES } from '../../services/investorForums/forumPackBuilder.js';

const TIMELINE_STATUS = {
  a_faire: { label: 'À faire', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  en_cours: { label: 'En cours', cls: 'bg-amber-100 text-amber-900 border-amber-200' },
  realise: { label: 'Réalisé', cls: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
};

const asArray = (value, fallback = []) => (Array.isArray(value) ? value : fallback);

function formatKpiValue(item) {
  if (item.format === 'money') return fmtCurrency(Number(item.value || 0));
  if (item.format === 'count') return `${Number(item.value || 0).toLocaleString('fr-FR')}${item.suffix || ''}`;
  return item.value ?? '—';
}

function RoomCard({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] ${className}`}>
      {title ? (
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500">
          {Icon ? <Icon size={16} /> : null}
          {title}
        </h3>
      ) : null}
      <div className={title ? 'mt-4' : ''}>{children}</div>
    </section>
  );
}

export function InvestorRoomHero({
  profile,
  readiness,
  dossierFileCount = 0,
  exportCount = 0,
  editing,
  manualDraft,
  onPatch,
}) {
  const k = profile.keyFigures || {};
  const seeking = manualDraft?.seeking || profile.investorRoom?.seeking || DEFAULT_SEEKING;
  const montant = seeking.montant_recherche || k.besoin_bp;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-slate-800/10 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f766e] p-6 md:p-8 text-white shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_45%)]" />
      <div className="relative z-10 space-y-6">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-teal-200/90">Investor Room · Data Room</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">HORIZON FARM</h1>
          <p className="mt-2 max-w-3xl text-base md:text-lg text-slate-200">{HORIZON_INVESTOR_ROOM_HERO_SUBTITLE}</p>
          <p className="mt-3 max-w-3xl text-sm text-slate-300/90 leading-relaxed">
            {profile.projectSummary?.pitch || HORIZON_INVESTOR_ROOM_POSITIONING}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {HERO_PILLS.map((pill) => (
            <span key={pill.id} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
              {pill.label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: 'Score préparation', value: `${readiness.score}/100` },
            { label: 'Besoin recherché', value: fmtCurrency(montant) },
            { label: 'CA actuel', value: fmtCurrency(k.ca_erp) },
            { label: 'Objectif annuel', value: fmtCurrency(k.ca_bp_annuel) },
            { label: 'Trésorerie', value: fmtCurrency(k.resultat_tresorerie) },
            { label: 'Documents attachés', value: String(dossierFileCount) },
            { label: 'Exports disponibles', value: String(Object.keys(FORUM_PACK_TYPES).length) },
            { label: 'Exports générés', value: String(exportCount) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-100/80">{stat.label}</p>
              <p className="mt-1 text-lg font-black">{stat.value}</p>
            </div>
          ))}
        </div>

        {editing ? (
          <label className="block rounded-2xl border border-white/15 bg-white/5 p-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-100">Positionnement (pitch principal)</span>
            <textarea
              className="mt-2 w-full rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              rows={3}
              value={manualDraft.project_pitch || ''}
              onChange={(e) => onPatch?.({ project_pitch: e.target.value })}
            />
          </label>
        ) : null}
      </div>
    </section>
  );
}

export function InvestorFounderSection({ profile, editing, manualDraft, onPatch }) {
  const founder = profile.founderProfile || {};
  return (
    <RoomCard title="Pourquoi Horizon Farm ?" icon={Users}>
      {editing ? (
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] font-black uppercase text-slate-500">Récit fondatrice</span>
            <textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={6} value={manualDraft.founder_story || ''} onChange={(e) => onPatch?.({ founder_story: e.target.value })} />
          </label>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="block"><span className="text-[10px] font-black uppercase text-slate-500">CV</span><textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={4} value={manualDraft.founder_cv || ''} onChange={(e) => onPatch?.({ founder_cv: e.target.value })} /></label>
            <label className="block"><span className="text-[10px] font-black uppercase text-slate-500">Diplômes</span><textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={2} value={manualDraft.founder_education || ''} onChange={(e) => onPatch?.({ founder_education: e.target.value })} /></label>
            <label className="block"><span className="text-[10px] font-black uppercase text-slate-500">Expériences</span><textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={4} value={manualDraft.founder_experience || ''} onChange={(e) => onPatch?.({ founder_experience: e.target.value })} /></label>
            <label className="block"><span className="text-[10px] font-black uppercase text-slate-500">Compétences clés</span><textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={2} value={manualDraft.founder_skills || ''} onChange={(e) => onPatch?.({ founder_skills: e.target.value })} /></label>
          </div>
          <label className="block"><span className="text-[10px] font-black uppercase text-slate-500">URL photo</span><input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={manualDraft.founder_photo_url || ''} onChange={(e) => onPatch?.({ founder_photo_url: e.target.value })} placeholder="https://…" /></label>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[140px_1fr] gap-5">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50 to-slate-50 aspect-square flex items-center justify-center overflow-hidden">
            {founder.photoUrl ? (
              <img src={founder.photoUrl} alt={founder.name} className="h-full w-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <p className="text-4xl">👩🏽</p>
                <p className="mt-2 text-xs font-black text-slate-600">{founder.name}</p>
              </div>
            )}
          </div>
          <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <p className="whitespace-pre-wrap">{founder.story || '—'}</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">CV</p><p className="mt-1 whitespace-pre-wrap">{founder.cv || '—'}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Diplômes</p><p className="mt-1">{founder.education || '—'}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Expériences</p><p className="mt-1 whitespace-pre-wrap">{founder.experience || '—'}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Compétences</p><p className="mt-1">{founder.skills || '—'}</p></div>
            </div>
          </div>
        </div>
      )}
    </RoomCard>
  );
}

export function InvestorVisionMissionSection({ profile, editing, manualDraft, onPatch }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <RoomCard title="Vision" icon={Sparkles}>
        {editing ? (
          <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={5} value={manualDraft.vision || ''} onChange={(e) => onPatch?.({ vision: e.target.value })} />
        ) : (
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{profile.projectSummary?.vision || '—'}</p>
        )}
      </RoomCard>
      <RoomCard title="Mission" icon={Target}>
        {editing ? (
          <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={5} value={manualDraft.mission || ''} onChange={(e) => onPatch?.({ mission: e.target.value })} />
        ) : (
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{profile.projectSummary?.mission || '—'}</p>
        )}
      </RoomCard>
    </div>
  );
}

export function InvestorWhyInvestSection({ profile, editing, manualDraft, onPatch }) {
  const rawCards = editing ? manualDraft.why_invest : profile.investorRoom?.whyInvest;
  const cards = asArray(rawCards).length ? asArray(rawCards) : DEFAULT_WHY_INVEST;
  return (
    <RoomCard title="Pourquoi investir ?" icon={TrendingUp}>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {cards.map((card, index) => (
          <div key={card.id || index} className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 hover:border-teal-200 transition-colors">
            {editing ? (
              <>
                <input className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm font-black mb-2" value={card.title || ''} onChange={(e) => {
                  const next = [...cards];
                  next[index] = { ...card, title: e.target.value };
                  onPatch?.({ why_invest: next });
                }} />
                <textarea className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm" rows={3} value={card.body || ''} onChange={(e) => {
                  const next = [...cards];
                  next[index] = { ...card, body: e.target.value };
                  onPatch?.({ why_invest: next });
                }} />
              </>
            ) : (
              <>
                <p className="font-black text-slate-900">{card.title}</p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{card.body}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </RoomCard>
  );
}

export function InvestorSeekingSection({ profile, editing, manualDraft, onPatch }) {
  const seeking = { ...DEFAULT_SEEKING, ...(editing ? manualDraft.seeking : profile.investorRoom?.seeking) };
  const patchSeeking = (patch) => onPatch?.({ seeking: { ...seeking, ...patch } });

  const fields = [
    { key: 'montant_recherche', label: 'Montant recherché', type: 'text' },
    { key: 'utilisation_fonds', label: 'Utilisation des fonds', type: 'textarea' },
    { key: 'priorite', label: 'Priorité', type: 'textarea' },
    { key: 'impact_attendu', label: 'Impact attendu', type: 'textarea' },
    { key: 'calendrier', label: 'Calendrier souhaité', type: 'text' },
  ];

  return (
    <RoomCard title="Ce que nous recherchons" icon={Target}>
      <div className="flex flex-wrap gap-2 mb-4">
        {(seeking.types || DEFAULT_SEEKING.types).map((type) => (
          <span key={type} className="rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-bold text-teal-900">{type}</span>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {fields.map((field) => (
          <label key={field.key} className="block rounded-xl border border-slate-100 bg-slate-50 p-3">
            <span className="text-[10px] font-black uppercase text-slate-500">{field.label}</span>
            {editing ? (
              field.type === 'textarea' ? (
                <textarea className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white" rows={2} value={seeking[field.key] || ''} onChange={(e) => patchSeeking({ [field.key]: e.target.value })} />
              ) : (
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white" value={seeking[field.key] || ''} onChange={(e) => patchSeeking({ [field.key]: e.target.value })} />
              )
            ) : (
              <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{field.key === 'montant_recherche' ? fmtCurrency(seeking[field.key]) : (seeking[field.key] || '—')}</p>
            )}
          </label>
        ))}
      </div>
    </RoomCard>
  );
}

export function InvestorObjectivesSection({ profile, editing, manualDraft, onPatch }) {
  const blocks = [
    { key: 'objectives_6m', label: 'Objectifs 6 mois', value: profile.objectives?.sixMonths },
    { key: 'objectives_12m', label: 'Objectifs 12 mois', value: profile.objectives?.twelveMonths },
    { key: 'objectives_3y', label: 'Objectifs 3 ans', value: profile.objectives?.threeYears },
  ];
  return (
    <RoomCard title="Objectifs" icon={Target}>
      <div className="grid md:grid-cols-3 gap-3">
        {blocks.map((block) => (
          <div key={block.key} className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50">
            <p className="text-xs font-black uppercase tracking-widest text-teal-700">{block.label}</p>
            {editing ? (
              <textarea className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white" rows={5} value={manualDraft[block.key] || ''} onChange={(e) => onPatch?.({ [block.key]: e.target.value })} />
            ) : (
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{block.value || '—'}</p>
            )}
          </div>
        ))}
      </div>
    </RoomCard>
  );
}

export function InvestorKpiSection({ profile, readiness }) {
  const items = buildInvestorKpiItems(profile, readiness);
  return (
    <RoomCard title="KPI investisseurs" icon={TrendingUp}>
      <p className="mb-4 text-xs text-slate-500">Données lues automatiquement depuis l&apos;ERP — aucun recalcul Finance dans ce module.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
              <span>{item.label}</span>
              {item.auto ? <span className="text-emerald-600">ERP</span> : null}
            </p>
            <p className="mt-2 text-xl font-black text-slate-900">{formatKpiValue(item)}</p>
          </div>
        ))}
      </div>
    </RoomCard>
  );
}

export function InvestorTimelineSection({ profile, editing, manualDraft, onPatch }) {
  const rawTimeline = editing ? manualDraft.timeline : profile.investorRoom?.timeline;
  const timeline = asArray(rawTimeline).length
    ? asArray(rawTimeline).map((year) => ({ ...year, items: asArray(year?.items) }))
    : DEFAULT_TIMELINE;
  const cycleStatus = (yearIndex, itemIndex) => {
    const statuses = ['a_faire', 'en_cours', 'realise'];
    const current = timeline[yearIndex]?.items?.[itemIndex]?.status || 'a_faire';
    const idx = statuses.indexOf(current);
    const next = statuses[(idx + 1) % statuses.length];
    const nextTimeline = timeline.map((year, yi) => (yi !== yearIndex ? year : {
      ...year,
      items: asArray(year.items).map((item, ii) => (ii !== itemIndex ? item : { ...item, status: next })),
    }));
    onPatch?.({ timeline: nextTimeline });
  };

  return (
    <RoomCard title="Roadmap" icon={Sparkles}>
      <div className="space-y-6">
        {timeline.map((yearBlock, yearIndex) => (
          <div key={yearBlock.year} className="relative pl-6 border-l-2 border-teal-200">
            <p className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-teal-600 ring-4 ring-teal-100" />
            <p className="text-lg font-black text-slate-900">{yearBlock.year}</p>
            <div className="mt-3 space-y-2">
              {(yearBlock.items || []).map((item, itemIndex) => {
                const st = TIMELINE_STATUS[item.status] || TIMELINE_STATUS.a_faire;
                return (
                  <div key={`${yearBlock.year}-${item.label}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                    {editing ? (
                      <button type="button" onClick={() => cycleStatus(yearIndex, itemIndex)} className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${st.cls}`}>
                        {st.label}
                      </button>
                    ) : (
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${st.cls}`}>{st.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </RoomCard>
  );
}

export function InvestorScoreSection({ readiness, onAction }) {
  const gained = readiness.checklist?.filter((i) => i.ok).reduce((s, i) => s + (i.points || 0), 0) || 0;
  const maxGain = readiness.checklist?.reduce((s, i) => s + (i.maxPoints || i.weight || 0), 0) || 100;
  return (
    <RoomCard title={`Score de préparation — ${readiness.score}/100`} icon={Sparkles}>
      <p className="text-sm text-slate-600">{readiness.explanation}</p>
      <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all" style={{ width: `${readiness.score}%` }} />
      </div>
      <div className="mt-5 grid lg:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-black uppercase text-emerald-700 mb-2">+ Points obtenus ({gained}/{maxGain} ERP)</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {readiness.breakdown?.filled?.map((item) => (
              <p key={`${item.id}-${item.label}`} className="text-xs text-emerald-800">+ {item.label}{item.points ? ` (${item.points} pts)` : ''}</p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-amber-700 mb-2">− Points manquants & actions</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {readiness.recommended_actions?.map((action) => (
              <div key={action.id} className="rounded-xl border border-amber-100 bg-amber-50 p-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-slate-900">{action.label}</p>
                  <p className="text-[10px] text-slate-600">{action.hint}</p>
                </div>
                <button type="button" onClick={() => onAction?.(action)} className="shrink-0 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">Agir</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RoomCard>
  );
}
