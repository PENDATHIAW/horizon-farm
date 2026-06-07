import { Link2, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../utils/format';
import { buildInvestmentAssetWorkflow } from '../utils/investmentWorkflows';
import { summarizeInvestmentAssetGaps } from '../services/investmentAssetSyncService';

export default function InvestmentAssetSyncPanel({ lines = [], props = {} }) {
  const summary = summarizeInvestmentAssetGaps(lines);
  if (!summary.count) return null;

  const createAsset = async (row) => {
    const workflow = buildInvestmentAssetWorkflow(row.line);
    if (!workflow) return toast.error('Actif non éligible ou déjà créé');
    const createByModule = {
      avicole: props.onCreateLot,
      animal: props.onCreateAnimal,
      culture: props.onCreateCulture,
      equipements: props.onCreateEquipement,
      stock: props.onCreateStock,
    };
    const refreshByModule = {
      avicole: props.onRefreshLots,
      animal: props.onRefreshAnimals,
      culture: props.onRefreshCultures,
      equipements: props.onRefreshEquipements,
      stock: props.onRefreshStock,
    };
    const creator = createByModule[workflow.module];
    if (!creator) return toast.error(`Création ${workflow.module} indisponible`);
    try {
      for (const payload of workflow.payloads) await creator(payload);
      await props.onUpdateBpInvestmentLine?.(row.lineId, workflow.linePatch);
      await props.onCreateBusinessEvent?.(workflow.event);
      await Promise.allSettled([refreshByModule[workflow.module]?.(), props.onRefreshBpInvestmentLines?.(), props.onRefreshBusinessEvents?.()]);
      toast.success(`Actif créé pour ${row.title}`);
    } catch (error) {
      toast.error(error.message || 'Création actif impossible');
    }
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Wallet size={15} /> Investissements payés sans actif</p>
          <h3 className="text-xl font-black text-[#2f2415] mt-1">Relier la dépense BP à l’exploitation</h3>
          <p className="text-sm text-[#8a7456] mt-1">{summary.count} ligne(s) payée(s) sans lot, animal, culture ou équipement créé.</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{fmtCurrency(summary.total)} à capitaliser</div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {summary.rows.slice(0, 8).map((row) => (
          <button key={row.id} type="button" onClick={() => createAsset(row)} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left hover:border-[#9a6b12]">
            <p className="font-black text-[#2f2415] flex items-center gap-2"><Link2 size={14} className="text-[#9a6b12]" /> {row.title}</p>
            <p className="mt-1 text-sm text-[#8a7456]">{row.detail}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
