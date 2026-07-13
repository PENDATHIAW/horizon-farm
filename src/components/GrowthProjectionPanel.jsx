import { AlertTriangle, CheckCircle2, Info, LineChart, Target } from 'lucide-react';
import { fmtNumber } from '../utils/format';

function toneClasses(status = '') {
  if (status === 'pret_vente' || status === 'conforme' || status === 'bon') return 'border-positive bg-positive-bg text-positive';
  if (status === 'risque_retard' || status === 'a_surveiller') return 'border-vigilance bg-vigilance-bg text-horizon-dark';
  return 'border-urgent bg-urgent-bg text-urgent';
}

function Mini({ label, value }) {
  return <div className="rounded-xl border border-line bg-white p-3 min-w-0"><p className="text-xs uppercase tracking-normal text-slate">{label}</p><p className="mt-1 text-sm font-semibold text-earth break-words">{value}</p></div>;
}

function Sparkline({ points = [], valueKey = 'weight' }) {
  const usable = points.filter((item) => Number(item?.[valueKey] || 0) > 0);
  if (usable.length < 2) return <div className="rounded-xl border border-dashed border-line bg-white p-4 text-sm text-slate flex items-start gap-2"><Info size={16} className="mt-1 text-neutral" aria-hidden="true" /> Ajouter au moins deux mesures pour afficher une vraie courbe.</div>;
  const values = usable.map((item) => Number(item[valueKey] || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const coords = usable.map((item, index) => {
    const x = usable.length === 1 ? 0 : (index / (usable.length - 1)) * 100;
    const y = 100 - ((Number(item[valueKey] || 0) - min) / spread) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');
  return <div className="rounded-xl border border-line bg-white p-3"><svg viewBox="0 0 100 100" className="h-32 w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Courbe d’évolution"><polyline fill="none" stroke="currentColor" strokeWidth="3" points={coords} /></svg><div className="mt-2 flex justify-between gap-2 text-xs text-slate"><span className="truncate">{usable[0]?.date || usable[0]?.start}</span><span className="truncate text-right">{usable[usable.length - 1]?.date || usable[usable.length - 1]?.end}</span></div></div>;
}

export function WeightProjectionPanel({ title = 'Projection croissance', projection }) {
  if (!projection) return <section className="rounded-2xl border border-line bg-card p-4 text-sm text-slate">Aucune projection de croissance disponible pour le moment.</section>;
  const Icon = projection.status === 'pret_vente' || projection.status === 'conforme' ? CheckCircle2 : AlertTriangle;
  return <section className="rounded-2xl border border-line bg-card p-4 space-y-3">
    <div className="flex items-start gap-3"><div className={`rounded-xl border p-2 ${toneClasses(projection.status)}`}><Icon size={18} aria-hidden="true" /></div><div><h3 className="text-sm font-semibold text-earth">{title}</h3><p className="mt-1 text-xs text-slate">Projection basée sur les pesées déjà saisies. Elle aide à agir avant la date cible.</p></div></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Mini label="Poids actuel" value={`${fmtNumber(projection.currentWeight)} kg`} /><Mini label="Objectif" value={`${fmtNumber(projection.targetWeight)} kg`} /><Mini label={`Projection J${projection.targetDays}`} value={`${fmtNumber(projection.projectedWeight)} kg`} /><Mini label="Gain moyen / jour" value={`${projection.gainPerDay} kg/j`} /></div>
    <div className={`rounded-xl border p-3 text-sm ${toneClasses(projection.status)}`}><b>{projection.label}</b> · {projection.action}</div>
    <Sparkline points={projection.history} />
  </section>;
}

export function PondeuseProductionPanel({ profile }) {
  if (!profile) return <section className="rounded-2xl border border-line bg-card p-4 text-sm text-slate">Aucune donnée de ponte disponible pour le moment.</section>;
  return <section className="rounded-2xl border border-line bg-card p-4 space-y-3">
    <div className="flex items-start gap-3"><div className={`rounded-xl border p-2 ${toneClasses(profile.status)}`}><LineChart size={18} aria-hidden="true" /></div><div><h3 className="text-sm font-semibold text-earth">Ponte & ramassage</h3><p className="mt-1 text-xs text-slate">Lecture des ramassages : les jours manquants ne sont pas inventés, ils sont signalés.</p></div></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Mini label="Effectif actif" value={fmtNumber(profile.activeCount)} /><Mini label="Taux ponte récent" value={`${profile.layingRate}%`} /><Mini label="Dernier ramassage" value={profile.last ? `${fmtNumber(profile.last.eggs)} œufs` : '—'} /><Mini label="Œufs / jour" value={profile.last ? fmtNumber(profile.last.dailyEggs) : '—'} /></div>
    {profile.missingCollectionAlert ? <div className="rounded-xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark"><b>Ramassage à vérifier :</b> {profile.missingCollectionAlert}</div> : null}
    <div className={`rounded-xl border p-3 text-sm ${toneClasses(profile.status)}`}><b>{profile.status === 'bon' ? 'Ponte correcte' : profile.status === 'a_surveiller' ? 'Ponte à surveiller' : 'Alerte ponte'}</b> · {profile.action}</div>
    <Sparkline points={profile.logs} valueKey="dailyEggs" />
  </section>;
}

export function SaleOpportunityGuardPanel({ guard }) {
  if (!guard) return null;
  return <div className={`rounded-xl border p-3 text-sm ${guard.exists ? 'border-vigilance bg-vigilance-bg text-horizon-dark' : 'border-positive bg-positive-bg text-positive'}`}><Target size={15} className="inline mr-1" aria-hidden="true" />{guard.message}</div>;
}
