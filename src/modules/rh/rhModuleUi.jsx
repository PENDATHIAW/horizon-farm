import { Bell, BrainCircuit, Wrench, Zap } from 'lucide-react';

export function RhStat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <p className="text-xs text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-xl font-black ${cls}`}>{value}</p>
    </div>
  );
}

export function RhSection({ icon: Icon, title, children, action }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
          <Icon size={20} /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function RhIaPanel({ findings = [], predictions = [], onApply, busyId, navigateRh }) {
  if (!findings.length && !predictions.length) return null;
  return (
    <RhSection icon={BrainCircuit} title="Surveillance IA ressources">
      <p className="mb-3 text-sm text-[#8a7456]">Équipements, maintenance, affectations équipe, coûts RH et documents croisés.</p>
      <div className="space-y-2">
        {findings.slice(0, 6).map((f) => (
          <div key={f.id} className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <b className="text-sm text-[#2f2415]">{f.title}</b>
              <p className="text-xs text-amber-800">{f.recommended_action || f.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigateRh(f.equipment_id ? 'Parc Matériel & Maintenance' : 'Personnel & Paie')}
                className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black"
              >
                Voir
              </button>
              <button
                type="button"
                disabled={busyId === f.id}
                onClick={() => onApply?.(f)}
                className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50"
              >
                {busyId === f.id ? '…' : 'Créer tâche'}
              </button>
            </div>
          </div>
        ))}
        {predictions.slice(0, 2).map((p) => (
          <div key={p.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm">
            <b>{p.title}</b>
            <p className="text-xs text-[#8a7456]">{p.description}</p>
          </div>
        ))}
      </div>
    </RhSection>
  );
}

export function RhCoherencePanel({ rows = [], onApply, busyId, navigateRh }) {
  if (!rows.length) return null;
  const tabFor = (row) => {
    if (row.type === 'maintenance') return 'Parc Matériel & Maintenance';
    if (row.type === 'affectation') return 'Personnel & Paie';
    if (row.type === 'preuve') return 'Registres & Analyses';
    return 'Registres & Analyses';
  };
  return (
    <RhSection icon={Zap} title="Incohérences à traiter">
      {rows.slice(0, 8).map((row) => (
        <div key={row.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => navigateRh(tabFor(row))} className="text-left">
            <b className="text-[#2f2415]">{row.title}</b>
            <p className="text-xs text-[#8a7456]">{row.detail}</p>
          </button>
          <button
            type="button"
            disabled={busyId === row.id}
            onClick={() => row.finding && onApply?.(row.finding)}
            className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700 disabled:opacity-50"
          >
            {busyId === row.id ? '…' : 'Corriger'}
          </button>
        </div>
      ))}
    </RhSection>
  );
}

export function RhMaintenanceQueuePanel({ queue = [], onSchedule, busyId, navigateRh }) {
  if (!queue.length) return null;
  return (
    <RhSection icon={Wrench} title="Maintenance prioritaire">
      {queue.slice(0, 6).map((row) => (
        <div key={row.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => navigateRh('Parc Matériel & Maintenance')} className="text-left">
            <b className="text-[#2f2415]">{row.name}</b>
            <p className="text-xs text-[#8a7456]">{row.status}</p>
          </button>
          <button
            type="button"
            disabled={busyId === row.id}
            onClick={() => onSchedule?.(row)}
            className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50"
          >
            {busyId === row.id ? '…' : 'Créer tâche'}
          </button>
        </div>
      ))}
    </RhSection>
  );
}

export function RhQuickAccessSection({ navigateRh, onMaintenanceForm }) {
  return (
    <RhSection icon={Bell} title="Accès rapides">
      <p className="text-sm text-[#8a7456]">Trois parcours métiers reliés aux onglets du module.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={onMaintenanceForm}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"
        >
          <b className="text-[#2f2415]">+ Maintenance</b>
          <p className="mt-1 text-sm text-[#8a7456]">Panne ou entretien équipement.</p>
        </button>
        <button
          type="button"
          onClick={() => navigateRh('Personnel & Paie')}
          className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"
        >
          <b className="text-[#2f2415]">Personnel & Paie</b>
          <p className="mt-1 text-sm text-[#8a7456]">Annuaire, équipes et clôture paie.</p>
        </button>
        <button
          type="button"
          onClick={() => navigateRh('Parc Matériel & Maintenance')}
          className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"
        >
          <b className="text-[#2f2415]">Parc matériel</b>
          <p className="mt-1 text-sm text-[#8a7456]">Suivi machines et capteurs.</p>
        </button>
      </div>
    </RhSection>
  );
}
