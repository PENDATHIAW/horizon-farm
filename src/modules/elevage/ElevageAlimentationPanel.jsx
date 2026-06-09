import { Beef, Bird, PackageCheck, Mic } from 'lucide-react';
import { useMemo } from 'react';
import { avicoleHasActiveBirds } from '../../utils/avicoleMetrics';
import { fmtNumber } from '../../utils/format';
import { emitHorizonForm } from '../../services/formModalManager';
import { buildFeedStockRuptureAlerts, suggestRationForTarget } from '../../utils/elevageFeedingIntel.js';
import DirectChargesBridge from '../DirectChargesBridge.jsx';
import ElevageFeedingDistribution from './ElevageFeedingDistribution.jsx';
import { ELEVAGE_ACTION_GRID, ELEVAGE_STAT_GRID, ElevageActionCard, ElevageLogRow, ElevageSection, ElevageStatCard } from './elevageUi.jsx';

const today = () => new Date().toISOString().slice(0, 10);

const isClosedAnimal = (row = {}) => {
  const status = String(row.status || row.statut || '').trim().toLowerCase();
  return ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((word) => status.includes(word));
};

export default function ElevageAlimentationPanel({ data, setTab, animalProps, avicoleProps, onNavigate, onOpenWorkflow, feedingHandlers = {} }) {
  const activeAnimals = useMemo(() => (animalProps.rows || []).filter((row) => !isClosedAnimal(row)), [animalProps.rows]);
  const activeLots = useMemo(() => (avicoleProps.rows || []).filter(avicoleHasActiveBirds), [avicoleProps.rows]);
  const recent = (data.feedLogs || []).slice(0, 8);
  const ruptureAlerts = useMemo(
    () => buildFeedStockRuptureAlerts({ stocks: data.stocks || [], feedLogs: data.feedLogs || [] }),
    [data.stocks, data.feedLogs],
  );
  const rationHint = useMemo(() => {
    const lot = activeLots[0];
    if (lot) return suggestRationForTarget(lot, 'lot');
    const animal = activeAnimals[0];
    if (animal) return suggestRationForTarget(animal, 'animal');
    return null;
  }, [activeLots, activeAnimals]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5">
        <h2 className="text-lg font-black text-[#2f2415]">Rations & distributions</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Le stock aliment est géré dans Achats & Stock — chaque distribution décrémente le stock via le workflow officiel.</p>
        {rationHint ? (
          <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
            <b>Suggestion ration :</b> {rationHint.message}
          </p>
        ) : null}
        {ruptureAlerts.length ? (
          <div className="mt-3 space-y-2">
            {ruptureAlerts.map((a) => (
              <p key={a.title} className={`rounded-xl border px-3 py-2 text-sm ${a.severity === 'danger' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                <b>{a.title}</b> — {a.message}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <div className={ELEVAGE_STAT_GRID}>
        <ElevageStatCard label="Sorties aliment" value={fmtNumber(data.feedLogs?.length || 0)} />
        <ElevageStatCard label="Coût cumulé" value={`${Math.round(data.feedCost || 0).toLocaleString('fr-FR')} F`} tone="warn" />
        <ElevageStatCard label="Stock aliment" value={fmtNumber(data.feedStocks?.length || 0)} tone={data.feedStocks?.length ? 'good' : 'warn'} />
        <ElevageStatCard label="Cibles actives" value={fmtNumber(activeAnimals.length + activeLots.length)} tone="good" />
      </div>


      <div id="elevage-feeding-form"><ElevageFeedingDistribution
        stocks={data.stocks || []}
        lots={avicoleProps.rows || []}
        animaux={animalProps.rows || []}
        handlers={feedingHandlers}
      /></div>

      <ElevageSection title="Actions rapides" subtitle="Distribution depuis le stock et réapprovisionnement.">
        <p className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-xs text-[#8a7456] flex items-center gap-2">
          <Mic size={14} /> Voix : « 12 tablettes ramassées » ou « 2 poulets morts » → draft Avicole — validation humaine obligatoire.
        </p>
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard title="+ Distribution aliment" text="Sortie stock, coût lot/animal, finance et alerte seuil." onClick={() => (onOpenWorkflow ? onOpenWorkflow('feeding') : emitHorizonForm('stock', 'stock_movement', 'Distribution aliment', { date: today(), category: 'alimentation' }))} />
          <ElevageActionCard title="Stock aliment" text="Achats & Stock — pas de gestion stock ici." onClick={() => onNavigate?.('achats_stock')} />
          <ElevageActionCard title="Consommation lots" text="Lecture Avicole — pas de registre ici." onClick={() => setTab('Avicole')} />
        </div>
      </ElevageSection>

      {recent.length ? (
        <ElevageSection title="Dernières distributions">
          {recent.map((row) => (
            <ElevageLogRow
              key={row.id || row.date}
              title={String(row.date || row.created_at || '—').slice(0, 10)}
              detail={row.produit || row.lot_nom || row.animal_id || row.lot_id || 'Aliment'}
              value={`${fmtNumber(row.quantite || row.quantity || 0)} u.`}
            />
          ))}
        </ElevageSection>
      ) : null}

      {activeAnimals.length ? (
        <ElevageSection title="Charges directes · animaux" subtitle="Transport, main-d'œuvre et frais liés au cheptel.">
          <DirectChargesBridge
            title="Charges directes animaux"
            targetType="animaux"
            targets={activeAnimals}
            businessEvents={animalProps.businessEvents || []}
            onCreateBusinessEvent={animalProps.onCreateBusinessEvent}
            onUpdateBusinessEvent={animalProps.onUpdateBusinessEvent}
            onDeleteBusinessEvent={animalProps.onDeleteBusinessEvent}
            onRefreshBusinessEvents={animalProps.onRefreshBusinessEvents}
          />
        </ElevageSection>
      ) : null}

      {activeLots.length ? (
        <ElevageSection title="Charges directes · avicole" subtitle="Frais opérationnels rattachés aux lots actifs.">
          <DirectChargesBridge
            title="Charges directes avicole"
            targetType="avicole"
            targets={activeLots}
            businessEvents={avicoleProps.businessEvents || []}
            onCreateBusinessEvent={avicoleProps.onCreateBusinessEvent}
            onUpdateBusinessEvent={avicoleProps.onUpdateBusinessEvent}
            onDeleteBusinessEvent={avicoleProps.onDeleteBusinessEvent}
            onRefreshBusinessEvents={avicoleProps.onRefreshBusinessEvents}
          />
        </ElevageSection>
      ) : null}

      <ElevageSection title="Accès rapide">
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard icon={Beef} title="Cheptel animaux" text="Fiches et effectifs par espèce." onClick={() => setTab('Animaux')} />
          <ElevageActionCard icon={Bird} title="Lots avicoles" text="Pondeuses et chair." onClick={() => setTab('Avicole')} />
          <ElevageActionCard icon={PackageCheck} title="Stock aliment" text="Achats & Stock." onClick={() => onNavigate?.('achats_stock')} />
        </div>
      </ElevageSection>
    </div>
  );
}
