import { AlertTriangle, Plus, ShoppingBag } from 'lucide-react';
import ModuleListHub from '../../components/module/ModuleListHub.jsx';
import { emitHorizonForm } from '../../services/formModalManager.js';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { AchatsStockSection } from './achatsStockUi.jsx';

const n = (v = 0) => Number(v || 0);

export default function AchatsStockPurchasesPanel({ data, setTab, onNavigate }) {
  const today = new Date().toISOString().slice(0, 10);
  const purchases = data.purchases || [];
  const missing = data.purchasesWithoutStock || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            emitHorizonForm('stock', 'stock_purchase', 'Nouvel achat stock', { date: today });
            setTab?.('Stock');
          }}
          className="inline-flex items-center gap-1 rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white"
        >
          <Plus size={14} /> Achat stock
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('finance_pilotage', { tab: 'Dépenses' })}
          className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-xs font-black text-[#2f2415]"
        >
          Finance → Dépenses
        </button>
      </div>

      {missing.length ? (
        <AchatsStockSection
          title="Achats sans entrée stock"
          subtitle="Ces dépenses finance n'ont pas encore d'impact inventaire — à corriger ici ou via réception stock."
        >
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{missing.length} achat(s) détecté(s) sans mouvement stock associé.</span>
          </div>
          <div className="divide-y divide-[#eadcc2]/60">
            {missing.map((trx) => (
              <div key={trx.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black text-[#2f2415]">{trx.libelle || trx.title || 'Achat'}</p>
                  <p className="text-xs text-[#8a7456]">
                    {trx.date || trx.created_at || '—'} · {fmtCurrency(n(trx.montant ?? trx.amount))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    emitHorizonForm('stock', 'stock_purchase', 'Réception stock', {
                      date: trx.date || today,
                      libelle: trx.libelle || trx.title,
                      finance_id: trx.id,
                    });
                    setTab?.('Stock');
                  }}
                  className="shrink-0 rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-black text-[#052e16]"
                >
                  Créer entrée stock
                </button>
              </div>
            ))}
          </div>
        </AchatsStockSection>
      ) : null}

      <ModuleListHub
        title="Achats & approvisionnements"
        intro="Mouvements d'achat détectés dans la finance et liés au stock."
        stats={[
          { label: 'Achats', value: fmtNumber(purchases.length) },
          { label: 'Montant', value: fmtCurrency(data.purchaseAmount), tone: 'warn' },
          { label: 'Sans stock', value: fmtNumber(missing.length), tone: missing.length ? 'warn' : 'good' },
          { label: 'Dettes', value: fmtCurrency(data.debt), tone: data.debt ? 'warn' : 'good' },
        ]}
        rows={purchases.map((row) => ({
          id: row.id || `${row.date}-${row.libelle}`,
          title: row.libelle || row.title || 'Achat',
          detail: `${row.date || row.created_at || '—'} · ${row.categorie || row.category || 'Approvisionnement'}`,
          value: fmtCurrency(n(row.montant ?? row.amount)),
          module: 'achats_stock',
          tab: 'Achats',
        }))}
        emptyLabel="Aucun achat enregistré."
        onNavigate={(module, opts) => {
          if (module === 'achats_stock') setTab?.(opts?.tab || 'Achats');
          else onNavigate?.(module, opts);
        }}
        actionModule="achats_stock"
      />

      <AchatsStockSection title="Dettes fournisseurs" subtitle="Suivi complet et relances sur l'onglet Fournisseurs.">
        <button
          type="button"
          onClick={() => setTab?.('Fournisseurs')}
          className="inline-flex items-center gap-2 rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm font-black text-[#2f2415] hover:bg-white"
        >
          <ShoppingBag size={16} />
          {data.supplierDebts?.length || 0} fournisseur(s) · {fmtCurrency(data.debt)} → Fournisseurs
        </button>
      </AchatsStockSection>
    </div>
  );
}
