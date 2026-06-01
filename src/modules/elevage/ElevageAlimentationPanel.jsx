import { Beef, Bird, PackageCheck, Utensils } from 'lucide-react';
import { emitHorizonForm } from '../../services/formModalManager';
import { fmtNumber } from '../../utils/format';
import DirectChargesBridge from '../DirectChargesBridge.jsx';
import { ELEVAGE_ACTION_GRID, ELEVAGE_STAT_GRID, ElevageActionCard, ElevageLogRow, ElevageSection, ElevageStatCard } from './elevageUi.jsx';

const today = () => new Date().toISOString().slice(0, 10);

export default function ElevageAlimentationPanel({ data, setTab, animalProps, avicoleProps, stats, recent }) {
  const activeAnimals = (animalProps.rows || []).filter((row) => {
    const status = String(row.status || row.statut || '').toLowerCase();
    return !['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((w) => status.includes(w));
  });
  const activeLots = avicoleProps.rows || [];

  return (
    <div className="space-y-5">
      <div className={ELEVAGE_STAT_GRID}>
        {stats.map((s) => <ElevageStatCard key={s.label} {...s} />)}
      </div>

      <ElevageSection title="Actions rapides" subtitle="Distributions, réapprovisionnement et lien avec le stock.">
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard icon={Utensils} title="+ Distribution aliment" text="Sortie stock / consommation lot ou animal." onClick={() => emitHorizonForm('stock', 'stock_movement', 'Distribution aliment', { date: today(), category: 'alimentation' })} />
          <ElevageActionCard title="Acheter aliment" text="Réapprovisionnement Achats & Stock." onClick={() => animalProps.onNavigate?.('achats_stock')} />
          <ElevageActionCard icon={Bird} title="Consommation avicole" text="Voir les lots et leur coût aliment." onClick={() => setTab('Avicole')} />
        </div>
      </ElevageSection>

      {recent?.length ? (
        <ElevageSection title="Dernières distributions">
          {recent.map((row) => (
            <ElevageLogRow
              key={row.id || row.date}
              title={String(row.date || row.created_at || '—').slice(0, 10)}
              detail={row.produit || row.lot_nom || row.lot_name || row.animal_id || 'Aliment'}
              value={`${fmtNumber(row.quantite || row.quantity || 0)} u.`}
            />
          ))}
        </ElevageSection>
      ) : null}

      <ElevageSection title="Charges directes animaux" subtitle="Transport, désinfection et autres charges liées au cheptel.">
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

      <ElevageSection title="Charges directes avicoles" subtitle="Charges par lot pondeuse ou chair.">
        <DirectChargesBridge
          title="Charges directes avicoles"
          targetType="avicole"
          targets={activeLots}
          businessEvents={avicoleProps.businessEvents || []}
          onCreateBusinessEvent={avicoleProps.onCreateBusinessEvent}
          onUpdateBusinessEvent={avicoleProps.onUpdateBusinessEvent}
          onDeleteBusinessEvent={avicoleProps.onDeleteBusinessEvent}
          onRefreshBusinessEvents={avicoleProps.onRefreshBusinessEvents}
        />
      </ElevageSection>

      <ElevageSection title="Accès rapide">
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard icon={Beef} title="Cheptel" text="Fiches animaux et effectifs." onClick={() => setTab('Animaux')} />
          <ElevageActionCard icon={Bird} title="Lots avicoles" text="Coût aliment par lot." onClick={() => setTab('Avicole')} />
          <ElevageActionCard icon={PackageCheck} title="Stock aliment" text="Achats & Stock." onClick={() => animalProps.onNavigate?.('achats_stock')} />
        </div>
      </ElevageSection>
    </div>
  );
}
