import { CalendarDays } from 'lucide-react';
import ElevageCyclesPanel from './ElevageCyclesPanel.jsx';
import ReproductionWorkflowForm from './ReproductionWorkflowForm.jsx';

function ReproductionSummary({ data, onOpenReproductionWorkflow }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#9a6b12]">Reproduction</p>
        <h2 className="mt-1 text-lg font-black text-[#2f2415]">Saillies, gestations et mises bas</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Workflow officiel — ouvrez Saillie, Gestation ou Mise bas ci-dessus.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Femelles</p>
          <p className="mt-1 text-xl font-black text-[#2f2415]">{data?.females ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Gestantes</p>
          <p className="mt-1 text-xl font-black text-amber-700">{data?.gestantesCount ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Naissances (événements)</p>
          <p className="mt-1 text-xl font-black text-emerald-700">{data?.birthLikeEvents ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Événements élevage</p>
          <p className="mt-1 text-xl font-black text-[#2f2415]">{data?.livestockEvents?.length ?? 0}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button type="button" onClick={() => onOpenReproductionWorkflow?.('saillie')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left hover:bg-[#dcfce7]">
          <b className="text-[#2f2415]">+ Saillie</b>
          <p className="mt-1 text-sm text-[#8a7456]">Workflow reproduction officiel.</p>
        </button>
        <button type="button" onClick={() => onOpenReproductionWorkflow?.('gestation')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left hover:bg-[#dcfce7]">
          <b className="text-[#2f2415]">+ Gestation</b>
          <p className="mt-1 text-sm text-[#8a7456]">Déclaration gestation — validation requise.</p>
        </button>
        <button type="button" onClick={() => onOpenReproductionWorkflow?.('mise_bas')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left hover:bg-[#dcfce7]">
          <b className="text-[#2f2415]">+ Mise bas / naissance</b>
          <p className="mt-1 text-sm text-[#8a7456]">Portée et naissance — validation requise.</p>
        </button>
      </div>
      {data?.gestantesList?.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-black text-amber-900">Gestations en cours</p>
          <ul className="mt-2 space-y-1">
            {data.gestantesList.map((a) => (
              <li key={a.id}>
                <b>{a.name || a.nom || a.id}</b>
                {a.statut_reproduction || a.reproduction_status ? ` · ${a.statut_reproduction || a.reproduction_status}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Cycles opérationnels + reproduction — calendrier détaillé J+40/J+90 : Centre → Saisons & marchés.
 */
export default function ElevageCyclesReproductionTab({
  cyclesPanelProps,
  reproductionData,
  reproductionFormProps,
  onOpenReproductionWorkflow,
  onNavigate,
}) {
  return (
    <div className="space-y-5">
      <ReproductionSummary data={reproductionData} onOpenReproductionWorkflow={onOpenReproductionWorkflow} />
      {reproductionFormProps?.draft ? <ReproductionWorkflowForm {...reproductionFormProps} /> : null}
      <ElevageCyclesPanel {...cyclesPanelProps} />
      <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]">
        <p className="font-black text-[#2f2415] flex items-center gap-2">
          <CalendarDays size={16} className="text-[#9a6b12]" aria-hidden="true" />
          Calendrier détaillé chair / bovins / pondeuses (J+40, J+90…)
        </p>
        <p className="mt-2 leading-relaxed">
          Le calendrier complet avec décisions Business Plan et dates pivot marché est centralisé dans le Centre décisionnel — pas de doublon ici.
        </p>
        {onNavigate ? (
          <button
            type="button"
            onClick={() => onNavigate('centre_ia', { tab: 'Saisons & marchés' })}
            className="mt-3 rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white"
          >
            Centre décisionnel → Saisons & marchés
          </button>
        ) : null}
      </section>
    </div>
  );
}
