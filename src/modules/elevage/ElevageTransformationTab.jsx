import { AlertTriangle, Beef, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { fmtNumber } from '../../utils/format';
import ElevageTransformationJournal from '../../components/ElevageTransformationJournal.jsx';
import TransformationOfficialForm from './TransformationOfficialForm.jsx';
import AnimalSlaughterStockBridge from '../AnimalSlaughterStockBridge.jsx';
import AvicoleTransformationBridge from '../AvicoleTransformationBridge.jsx';

function ActionBtn({ icon: Icon, label, onClick, primary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[48px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${primary ? 'bg-[#2f2415] text-white' : 'border border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]'}`}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

/**
 * Transformation — formulaire officiel unique, actions compactes, journal en annexe.
 */
export default function ElevageTransformationTab({
  data,
  setTab,
  onNavigate,
  onOpenWorkflow,
  onPrepareTransformation,
  transformationFormProps,
  animalBridgeProps,
  avicoleBridgeProps,
  healthBlocks,
  hasTransformationDraft = false,
}) {
  const [legacyOpen, setLegacyOpen] = useState(false);
  const showForm = hasTransformationDraft || transformationFormProps?.transformationDraft;
  const salesCount = data.salesJournalCount ?? data.transformationSalesCount ?? data.lotsToSell?.length ?? 0;

  const openForm = (ctx = {}) => {
    onPrepareTransformation?.({ transformType: ctx.transformType || 'abattage', ...ctx });
  };

  return (
    <div className="space-y-4">
      {healthBlocks?.blocked ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <b>Transformation / vente bloquée (sanitaire)</b>
          <p className="mt-1 text-xs">{healthBlocks.messages.join(' ')}</p>
        </div>
      ) : null}

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-4 shadow-sm space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#9a6b12]">Canal officiel</p>
          <h2 className="mt-1 text-lg font-black text-[#2f2415]">Vivant → produit fini</h2>
          <p className="mt-1 text-sm text-[#8a7456]">
            Un seul formulaire de validation — abattage, réforme, mortalité lot. Stock viande et finance après validation explicite.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-xs text-[#8a7456]">Ventes journalisées</p>
            <p className="text-lg font-black text-[#2f2415]">{fmtNumber(salesCount)}</p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-xs text-[#8a7456]">Lignes journal</p>
            <p className="text-lg font-black text-[#2f2415]">{fmtNumber(data.transformationRows?.length || 0)}</p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-xs text-[#8a7456]">Lots à vendre</p>
            <p className="text-lg font-black text-amber-700">{fmtNumber(data.lotsToSell?.length || 0)}</p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-xs text-[#8a7456]">Mortalité lots</p>
            <p className="text-lg font-black text-[#2f2415]">{fmtNumber(data.recentMortality)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionBtn icon={Beef} label="+ Transformation" primary onClick={() => openForm({ transformType: 'abattage' })} />
          <ActionBtn icon={ShoppingCart} label="Préparer vente" onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
        </div>
        <p className="text-xs text-[#8a7456]">
          Un seul formulaire — choisissez le <b>type</b> (abattage, réforme, mortalité lot ou animal, vente vivant, etc.) : les champs s’adaptent automatiquement.
        </p>
      </section>

      {showForm && transformationFormProps ? (
        <TransformationOfficialForm {...transformationFormProps} />
      ) : (
        <p className="rounded-2xl border border-dashed border-[#d6c3a0] bg-[#fffdf8] px-4 py-3 text-sm text-[#8a7456]">
          Cliquez <b>+ Transformation</b> pour ouvrir le formulaire officiel — pas de double saisie sur les cartes ci-dessus.
        </p>
      )}

      <details className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <summary className="cursor-pointer font-black text-sm text-[#2f2415]">Journal des transformations</summary>
        <div className="mt-3">
          <ElevageTransformationJournal rows={data.transformationRows || []} onOpenCommercial={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
        </div>
      </details>

      <details className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4" open={legacyOpen} onToggle={(e) => setLegacyOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer font-black text-sm text-[#2f2415]">Workflows complémentaires (legacy)</summary>
        <p className="mt-2 text-xs text-[#8a7456]">Bridges historiques — préférez le formulaire officiel ci-dessus.</p>
        <div className="mt-3 space-y-4">
          {animalBridgeProps ? (
            <div id="elevage-animal-slaughter-bridge">
              <AnimalSlaughterStockBridge {...animalBridgeProps} />
            </div>
          ) : null}
          {avicoleBridgeProps ? <AvicoleTransformationBridge {...avicoleBridgeProps} /> : null}
        </div>
      </details>
    </div>
  );
}
