import { AlertTriangle, CreditCard, FileWarning, Plus, ShoppingBag, Truck } from 'lucide-react';
import ModuleListHub from '../../components/module/ModuleListHub.jsx';
import { openStockPurchaseForm } from '../../utils/achatsStockFormBridge.js';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { AchatsStockSection, AchatsStockTodoRow } from './achatsStockUi.jsx';

const n = (v = 0) => Number(v || 0);
const label = (row = {}) => row.produit || row.name || row.nom || row.stock_id || 'Article';

export default function AchatsStockPurchasesPanel({ data, setTab, onNavigate, onRelance, busyId }) {
  const today = new Date().toISOString().slice(0, 10);
  const purchases = data.purchases || [];
  const missing = data.purchasesWithoutStock || [];
  const ops = data.operational || {};

  return (
    <div className="space-y-4 achats-stock-mobile">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => openStockPurchaseForm({ setTab, intent_label: 'Nouvelle réception', draft_fields: { date: today } })}
          className="inline-flex items-center gap-1 rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white"
        >
          <Plus size={14} /> Nouvelle réception
        </button>
        <button
          type="button"
          onClick={() => openStockPurchaseForm({ setTab, intent_label: 'Ajouter preuve achat', draft_fields: { date: today } })}
          className="inline-flex items-center gap-1 rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-xs font-black text-[#2f2415]"
        >
          <FileWarning size={14} /> Ajouter preuve
        </button>
        <button
          type="button"
          onClick={() => setTab?.('Fournisseurs')}
          className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800"
        >
          <CreditCard size={14} /> Payer fournisseur
        </button>
      </div>

      {ops.recentReceptions?.length ? (
        <AchatsStockSection title="Réceptions récentes" subtitle="Dernières entrées de stock enregistrées.">
          <div className="divide-y divide-[#eadcc2]/60">
            {ops.recentReceptions.map((row) => (
              <AchatsStockTodoRow
                key={row.id}
                title={`Entrée · ${label({ id: row.stock_id })}`}
                detail={`${String(row.movement_date || '').slice(0, 10)} · ${row.quantity} ${row.unit || 'u.'} · ${row.source_module || 'stock'}`}
                onOpen={() => setTab?.('Mouvements')}
              />
            ))}
          </div>
        </AchatsStockSection>
      ) : null}

      {ops.unpaidPurchases?.length ? (
        <AchatsStockSection title="Achats à payer" subtitle="Dépenses finance en attente de règlement.">
          <div className="divide-y divide-[#eadcc2]/60">
            {ops.unpaidPurchases.slice(0, 6).map((trx) => (
              <AchatsStockTodoRow
                key={trx.id}
                title={trx.libelle || trx.title || 'Achat'}
                detail={`${trx.date || '—'} · ${fmtCurrency(n(trx.montant ?? trx.amount))}`}
                actionLabel="Payer"
                onOpen={() => onNavigate?.('finance_pilotage', { tab: 'Dépenses' })}
                onAction={() => setTab?.('Fournisseurs')}
              />
            ))}
          </div>
        </AchatsStockSection>
      ) : null}

      {ops.purchasesWithoutProof?.length ? (
        <AchatsStockSection title="Achats sans preuve" subtitle="Justificatifs manquants — à compléter.">
          <div className="divide-y divide-[#eadcc2]/60">
            {ops.purchasesWithoutProof.slice(0, 5).map((trx) => (
              <AchatsStockTodoRow
                key={trx.id}
                title={trx.libelle || trx.id}
                detail={fmtCurrency(n(trx.montant ?? trx.amount))}
                actionLabel="Preuve"
                onOpen={() => setTab?.('Annexe')}
                onAction={() => openStockPurchaseForm({
                  setTab,
                  intent_label: 'Ajouter preuve',
                  draft_fields: { finance_id: trx.id, date: trx.date || today },
                })}
              />
            ))}
          </div>
        </AchatsStockSection>
      ) : null}

      {ops.suppliersToContact?.length ? (
        <AchatsStockSection title="Fournisseurs à contacter" subtitle="Dettes actives — relance ou paiement.">
          <div className="divide-y divide-[#eadcc2]/60">
            {ops.suppliersToContact.map((s) => (
              <AchatsStockTodoRow
                key={s.id || s.name}
                title={s.name}
                detail={`Dette ${fmtCurrency(s.total)}`}
                actionLabel="Relancer"
                busy={busyId === (s.id || s.name)}
                onOpen={() => setTab?.('Fournisseurs')}
                onAction={() => onRelance?.(s)}
              />
            ))}
          </div>
        </AchatsStockSection>
      ) : null}

      {ops.restockNeeds?.length ? (
        <AchatsStockSection title="Besoins réapprovisionnement" subtitle="Articles sous seuil minimum.">
          <div className="divide-y divide-[#eadcc2]/60">
            {ops.restockNeeds.map((row) => (
              <AchatsStockTodoRow
                key={row.id}
                title={label(row)}
                detail={`${fmtNumber(n(row.quantite ?? row.quantity))} u. · seuil ${fmtNumber(n(row.seuil ?? row.threshold))}`}
                actionLabel="Réappro"
                onOpen={() => setTab?.('Stock')}
                onAction={() => openStockPurchaseForm({
                  setTab,
                  intent_label: 'Réapprovisionner',
                  draft_fields: { date: today, produit: label(row), stock_id: row.id },
                })}
              />
            ))}
          </div>
        </AchatsStockSection>
      ) : null}

      {missing.length ? (
        <AchatsStockSection title="Achats sans entrée stock" subtitle="Ces dépenses finance n'ont pas encore d'impact inventaire.">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{missing.length} achat(s) détecté(s) sans mouvement stock associé.</span>
          </div>
          <div className="divide-y divide-[#eadcc2]/60">
            {missing.map((trx) => (
              <AchatsStockTodoRow
                key={trx.id}
                title={trx.libelle || trx.title || 'Achat'}
                detail={`${trx.date || '—'} · ${fmtCurrency(n(trx.montant ?? trx.amount))}`}
                actionLabel="Créer entrée"
                onOpen={() => setTab?.('Stock')}
                onAction={() => openStockPurchaseForm({
                  setTab,
                  intent_label: 'Réception stock',
                  draft_fields: { date: trx.date || today, libelle: trx.libelle || trx.title, finance_id: trx.id },
                })}
              />
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

      <AchatsStockSection title="Dettes fournisseurs" subtitle="Suivi complet sur l'onglet Fournisseurs.">
        <button
          type="button"
          onClick={() => setTab?.('Fournisseurs')}
          className="inline-flex items-center gap-2 rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm font-black text-[#2f2415] hover:bg-white"
        >
          <ShoppingBag size={16} />
          {data.supplierDebts?.length || 0} fournisseur(s) · {fmtCurrency(data.debt)} → Fournisseurs
        </button>
        <p className="text-xs text-[#8a7456] flex items-center gap-1 mt-2">
          <Truck size={13} /> Chaque réception suit le même parcours : stock, finance, mouvement et preuve.
        </p>
      </AchatsStockSection>
    </div>
  );
}
