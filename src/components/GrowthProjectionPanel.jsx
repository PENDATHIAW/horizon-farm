import { AlertTriangle, CheckCircle2, LineChart, Target } from 'lucide-react';
import { fmtNumber } from '../utils/format';

function toneClasses(status = '') {
  if (status === 'pret_vente' || status === 'conforme' || status === 'bon') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'risque_retard' || status === 'a_surveiller') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-red-200 bg-red-50 text-red-700';
}

function Mini({ label, value }) {
  return <div className="rounded-xl border border-[#eadcc2] bg-white p-3"><p className="text-[11px] uppercase tracking-wide text-[#8a7456]">{label}</p><p className="mt-1 text-sm font-black text-[#2f2415]">{value}</p></div>;
}

function Sparkline({ points = [], valueKey = 'weight' }) {
  const usable = points.filter((item) => Number(item?.[valueKey] || 0) > 0);
  if (usable.length < 2) return <div className="rounded-xl border border-dashed border-[#d6c3a0] bg-white p-4 text-sm text-[#8a7456]">Ajouter au moins deux pesées pour afficher une vraie courbe.</div>;
  const values = usable.map((item) => Number(item[valueKey] || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const coords = usable.map((item, index) => {
    const x = usable.length === 1 ? 0 : (index / (usable.length - 1)) * 100;
    const y = 100 - ((Number(item[valueKey] || 0) - min) / spread) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');
  return <div className="rounded-xl border border-[#eadcc2] bg-white p-3"><svg viewBox="0 0 100 100" className="h-32 w-full" preserveAspectRatio="none"><polyline fill="none" stroke="currentColor" strokeWidth="3" points={coords} /></svg><div className="mt-2 flex justify-between text-[11px] text-[#8a7456]"><span>{usable[0]?.date || usable[0]?.start}</span><span>{usable[usable.length - 1]?.date || usable[usable.length - 1]?.end}</span></div></div>;
}

export function WeightProjectionPanel({ title = 'Projection croissance', projection }) {
  if (!projection) return null;
  const Icon = projection.status === 'pret_vente' || projection.status === 'conforme' ? CheckCircle2 : AlertTriangle;
  return <section className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4 space-y-3">
    <div className="flex items-start gap-3"><div className={`rounded-xl border p-2 ${toneClasses(projection.status)}`}><Icon size={18} /></div><div><h3 className="text-sm font-black text-[#2f2415]">{title}</h3><p className="mt-1 text-xs text-[#8a7456]">Projection basée sur l’historique des pesées. Elle sert à agir avant la date cible, pas à attendre l’échec.</p></div></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Mini label="Poids actuel" value={`${fmtNumber(projection.currentWeight)} kg`} /><Mini label="Objectif" value={`${fmtNumber(projection.targetWeight)} kg`} /><Mini label={`Projection J${projection.targetDays}`} value={`${fmtNumber(projection.projectedWeight)} kg`} /><Mini label="Gain moyen / jour" value={`${projection.gainPerDay} kg/j`} /></div>
    <div className={`rounded-xl border p-3 text-sm ${toneClasses(projection.status)}`}><b>{projection.label}</b> · {projection.action}</div>
    <Sparkline points={projection.history} />
  </section>;
}

export function PondeuseProductionPanel({ profile }) {
  if (!profile) return null;
  return <section className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4 space-y-3">
    <div className="flex items-start gap-3"><div className={`rounded-xl border p-2 ${toneClasses(profile.status)}`}><LineChart size={18} /></div><div><h3 className="text-sm font-black text-[#2f2415]">Ponte & ramassage</h3><p className="mt-1 text-xs text-[#8a7456]">Lecture des ramassages : les jours manquants ne sont pas inventés, ils sont signalés.</p></div></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Mini label="Effectif actif" value={fmtNumber(profile.activeCount)} /><Mini label="Taux ponte récent" value={`${profile.layingRate}%`} /><Mini label="Dernier ramassage" value={profile.last ? `${fmtNumber(profile.last.eggs)} œufs` : '—'} /><Mini label="Œufs / jour" value={profile.last ? fmtNumber(profile.last.dailyEggs) : '—'} /></div>
    {profile.missingCollectionAlert ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><b>Ramassage à vérifier :</b> {profile.missingCollectionAlert}</div> : null}
    <div className={`rounded-xl border p-3 text-sm ${toneClasses(profile.status)}`}><b>{profile.status === 'bon' ? 'Ponte correcte' : profile.status === 'a_surveiller' ? 'Ponte à surveiller' : 'Alerte ponte'}</b> · {profile.action}</div>
    <Sparkline points={profile.logs} valueKey="dailyEggs" />
  </section>;
}

export function SaleOpportunityGuardPanel({ guard }) {
  if (!guard) return null;
  return <div className={`rounded-xl border p-3 text-sm ${guard.exists ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><Target size={15} className="inline mr-1" />{guard.message}</div>;
}
