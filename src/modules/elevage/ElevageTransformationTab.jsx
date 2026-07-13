import {  Beef, ShoppingCart } from 'lucide-react';
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
      className={`flex min-h-[48px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${primary ? 'bg-earth text-white' : 'border border-line bg-card text-earth'}`}
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
  onNavigate,
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
        <div className="rounded-2xl border border-urgent bg-urgent-bg p-4 text-sm text-urgent">
          <b>Transformation / vente bloquée (sanitaire)</b>
          <p className="mt-1 text-xs">{healthBlocks.messages.join(' ')}</p>
        </div>
      ) : null}

      <section className="rounded-3xl border border-line bg-white p-4 shadow-card space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-horizon-dark">Canal officiel</p>
          <h2 className="mt-1 text-lg font-semibold text-earth">Vivant → produit fini</h2>
          <p className="mt-1 text-sm text-slate">
            Un seul formulaire de validation — abattage, réforme, mortalité lot. Stock viande et finance après validation explicite.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-card p-3">
            <p className="text-xs text-slate">Ventes journalisées</p>
            <p className="text-lg font-semibold text-earth">{fmtNumber(salesCount)}</p>
          </div>
          <div className="rounded-xl border border-line bg-card p-3">
            <p className="text-xs text-slate">Lignes journal</p>
            <p className="text-lg font-semibold text-earth">{fmtNumber(data.transformationRows?.length || 0)}</p>
          </div>
          <div className="rounded-xl border border-line bg-card p-3">
            <p className="text-xs text-slate">Lots à vendre</p>
            <p className="text-lg font-semibold text-horizon-dark">{fmtNumber(data.lotsToSell?.length || 0)}</p>
          </div>
          <div className="rounded-xl border border-line bg-card p-3">
            <p className="text-xs text-slate">Mortalité lots</p>
            <p className="text-lg font-semibold text-earth">{fmtNumber(data.recentMortality)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionBtn icon={Beef} label="+ Transformation" primary onClick={() => openForm({ transformType: 'abattage' })} />
          <ActionBtn icon={ShoppingCart} label="Préparer vente" onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
        </div>
        <p className="text-xs text-slate">
          Un seul formulaire — choisissez le <b>type</b> (abattage, réforme, mortalité lot ou animal, vente vivant, etc.) : les champs s’adaptent automatiquement.
        </p>
      </section>

      {showForm && transformationFormProps ? (
        <TransformationOfficialForm {...transformationFormProps} />
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-3 text-sm text-slate">
          Cliquez <b>+ Transformation</b> pour ouvrir le formulaire officiel — pas de double saisie sur les cartes ci-dessus.
        </p>
      )}

      <details className="rounded-2xl border border-line bg-card p-4">
        <summary className="cursor-pointer font-semibold text-sm text-earth">Journal des transformations</summary>
        <div className="mt-3">
          <ElevageTransformationJournal rows={data.transformationRows || []} onOpenCommercial={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
        </div>
      </details>

      <details className="rounded-2xl border border-line bg-card p-4" open={legacyOpen} onToggle={(e) => setLegacyOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer font-semibold text-sm text-earth">Workflows complémentaires (historique)</summary>
        <p className="mt-2 text-xs text-slate">Bridges historiques — préférez le formulaire officiel ci-dessus.</p>
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
