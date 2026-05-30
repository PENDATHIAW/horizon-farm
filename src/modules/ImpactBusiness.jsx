import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import ImpactBusinessShell from './ImpactBusinessShell.jsx';

export default function ImpactBusinessModule(props) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Impact & Valeur</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Ce que l&apos;ERP apporte à la ferme</h1>
            <p className="mt-1 text-sm text-[#8a7456] max-w-3xl">
              Valeur concrète, dossier banque/partenaire, clients, fournisseurs et domaines à renforcer — indépendamment du module Vision.
            </p>
            {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
          </div>
        </div>
      </section>
      <ImpactBusinessShell {...props} />
    </div>
  );
}
