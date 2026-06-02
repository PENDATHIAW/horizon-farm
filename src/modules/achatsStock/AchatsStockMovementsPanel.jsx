import { Beef, PackageCheck } from 'lucide-react';
import ModuleListHub from '../../components/module/ModuleListHub.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { AchatsStockActionCard, AchatsStockSection, ACHATS_STOCK_ACTION_GRID } from './achatsStockUi.jsx';

export default function AchatsStockMovementsPanel({ data, onNavigate, setTab }) {
  const movements = [...(data.feedLogs || []), ...(data.stockEvents || [])].sort((a, b) =>
    String(b.date || b.created_at || '').localeCompare(String(a.date || a.created_at || '')),
  );

  return (
    <div className="space-y-4">
      <AchatsStockSection
        title="Où agir ?"
        subtitle="Entrées/sorties stock ici · distributions aliment vers cheptel/lots sur Élevage → Alimentation."
      >
        <div className={ACHATS_STOCK_ACTION_GRID}>
          <AchatsStockActionCard
            icon={PackageCheck}
            title="Stock & mouvements"
            text="Entrées, sorties, pertes et valorisation inventaire."
            onClick={() => setTab?.('Stock')}
          />
          <AchatsStockActionCard
            icon={Beef}
            title="Élevage → Alimentation"
            text="Distributions aliment liées aux animaux et lots avicoles."
            onClick={() => onNavigate?.('elevage', { tab: 'Alimentation' })}
          />
        </div>
      </AchatsStockSection>

      <ModuleListHub
        title="Mouvements stock & alimentation"
        intro="Historique unifié : événements stock et logs alimentation enregistrés."
        stats={[
          { label: 'Mouvements', value: fmtNumber(movements.length) },
          { label: 'Sorties aliment', value: fmtNumber(data.feedLogs?.length || 0) },
          { label: 'Sous seuil', value: fmtNumber(data.lowStock?.length || 0), tone: data.lowStock?.length ? 'warn' : 'good' },
          { label: 'Valeur stock', value: fmtCurrency(data.stockValue) },
        ]}
        rows={movements.map((row) => ({
          id: row.id || `${row.date}-${row.produit || row.libelle}`,
          title: row.produit || row.name || row.libelle || row.title || 'Mouvement',
          detail: `${row.date || row.created_at || '—'} · ${row.type || row.categorie || row.event_type || 'Stock'}`,
          value: row.quantite != null ? `${row.quantite} u.` : undefined,
          module: 'achats_stock',
          tab: 'Mouvements',
        }))}
        emptyLabel="Aucun mouvement enregistré."
        onNavigate={(module, opts) => {
          if (module === 'achats_stock') setTab?.(opts?.tab || 'Mouvements');
          else onNavigate?.(module, opts);
        }}
      />
    </div>
  );
}
