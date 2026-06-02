import { Beef, Bird, PackageCheck } from 'lucide-react';
import { useMemo } from 'react';
import { avicoleHasActiveBirds } from '../../utils/avicoleMetrics';
import { fmtNumber } from '../../utils/format';
import { emitHorizonForm } from '../../services/formModalManager';
import DirectChargesBridge from '../DirectChargesBridge.jsx';
import ElevageFeedingDistribution from './ElevageFeedingDistribution.jsx';
import { ELEVAGE_ACTION_GRID, ELEVAGE_STAT_GRID, ElevageActionCard, ElevageLogRow, ElevageSection, ElevageStatCard } from './elevageUi.jsx';

const today = () => new Date().toISOString().slice(0, 10);

const isClosedAnimal = (row = {}) => {
  const status = String(row.status || row.statut || '').trim().toLowerCase();
  return ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((word) => status.includes(word));
};

export default function ElevageAlimentationPanel({ data, setTab, animalProps, avicoleProps, onNavigate, feedingHandlers = {} }) {
  const activeAnimals = useMemo(() => (animalProps.rows || []).filter((row) => !isClosedAnimal(row)), [animalProps.rows]);
  const activeLots = useMemo(() => (avicoleProps.rows || []).filter(avicoleHasActiveBirds), [avicoleProps.rows]);
  const recent = (data.feedLogs || []).slice(0, 8);

  return (
    <div className="space-y-5">
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
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard title="+ Distribution aliment" text="Formulaire ci-dessus — seule saisie qui retire le stock aliment." onClick={() => document.getElementById('elevage-feeding-form')?.scrollIntoView({ behavior: 'smooth' })} />
          <ElevageActionCard title="Acheter aliment" text="Réapprovisionnement Achats & Stock." onClick={() => onNavigate?.('achats_stock')} />
          <ElevageActionCard title="Voir consommation lots" text="Historique et effectifs avicole." onClick={() => setTab('Avicole')} />
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
