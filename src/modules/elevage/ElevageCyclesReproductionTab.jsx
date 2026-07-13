import { CalendarDays } from 'lucide-react';
import ElevageCyclesPanel from './ElevageCyclesPanel.jsx';
import ReproductionWorkflowForm from './ReproductionWorkflowForm.jsx';

function ReproductionSummary({ data, onOpenReproductionWorkflow }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-horizon-dark">Reproduction</p>
        <h2 className="mt-1 text-lg font-semibold text-earth">Saillies, gestations et mises bas</h2>
        <p className="mt-1 text-sm text-slate">Workflow officiel — ouvrez Saillie, Gestation ou Mise bas ci-dessus.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Femelles</p>
          <p className="mt-1 text-xl font-semibold text-earth">{data?.females ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Gestantes</p>
          <p className="mt-1 text-xl font-semibold text-horizon-dark">{data?.gestantesCount ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Naissances (événements)</p>
          <p className="mt-1 text-xl font-semibold text-positive">{data?.birthLikeEvents ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Événements élevage</p>
          <p className="mt-1 text-xl font-semibold text-earth">{data?.livestockEvents?.length ?? 0}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button type="button" onClick={() => onOpenReproductionWorkflow?.('saillie')} className="rounded-2xl border border-line bg-card p-4 text-left hover:bg-positive-bg">
          <b className="text-earth">+ Saillie</b>
          <p className="mt-1 text-sm text-slate">Workflow reproduction officiel.</p>
        </button>
        <button type="button" onClick={() => onOpenReproductionWorkflow?.('gestation')} className="rounded-2xl border border-line bg-card p-4 text-left hover:bg-positive-bg">
          <b className="text-earth">+ Gestation</b>
          <p className="mt-1 text-sm text-slate">Déclaration gestation — validation requise.</p>
        </button>
        <button type="button" onClick={() => onOpenReproductionWorkflow?.('mise_bas')} className="rounded-2xl border border-line bg-card p-4 text-left hover:bg-positive-bg">
          <b className="text-earth">+ Mise bas / naissance</b>
          <p className="mt-1 text-sm text-slate">Portée et naissance — validation requise.</p>
        </button>
      </div>
      {data?.gestantesList?.length ? (
        <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4 text-sm">
          <p className="font-semibold text-horizon-dark">Gestations en cours</p>
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
    <div className="space-y-6">
      <ReproductionSummary data={reproductionData} onOpenReproductionWorkflow={onOpenReproductionWorkflow} />
      {reproductionFormProps?.draft ? <ReproductionWorkflowForm {...reproductionFormProps} /> : null}
      <ElevageCyclesPanel {...cyclesPanelProps} />
      <section className="rounded-2xl border border-line bg-card p-4 text-sm text-slate">
        <p className="font-semibold text-earth flex items-center gap-2">
          <CalendarDays size={16} className="text-horizon-dark" aria-hidden="true" />
          Calendrier détaillé chair / bovins / pondeuses (J+40, J+90…)
        </p>
        <p className="mt-2 leading-relaxed">
          Le calendrier complet avec décisions Business Plan et dates pivot marché est centralisé dans le Centre décisionnel — pas de doublon ici.
        </p>
        {onNavigate ? (
          <button
            type="button"
            onClick={() => onNavigate('centre_ia', { tab: 'Saisons & marchés' })}
            className="mt-3 rounded-xl bg-earth px-4 py-2 text-xs font-semibold text-white"
          >
            Centre décisionnel → Saisons & marchés
          </button>
        ) : null}
      </section>
    </div>
  );
}
