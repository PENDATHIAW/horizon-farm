import { AlertTriangle, Package, RefreshCw, Snowflake, Utensils } from 'lucide-react';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import {
  buildFeedCoherenceAlerts,
  dlcAlertLevel,
  isCommerciallyBlocked,
  requiresDlc,
} from '../utils/stockFreshProduct';
import { buildProductionCoherenceAlerts } from '../utils/productionStockCatalog';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim();
const qty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const seuil = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.min_quantity);
const unitPrice = (row = {}) => toNumber(row.prixunit ?? row.prixUnit ?? row.prix_unitaire ?? row.unit_price);
const label = (row = {}) => row.produit || row.nom || row.name || row.id || 'Produit';

function AlertCard({ tone = 'amber', title, detail, actionLabel, onAction }) {
  const cls = tone === 'red' ? 'border-red-300 bg-red-50 text-red-900' : tone === 'black' ? 'border-[#2f2415] bg-[#2f2415] text-white' : tone === 'orange' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]';
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm opacity-90">{detail}</p>
      {onAction ? (
        <button type="button" onClick={onAction} className={`mt-3 rounded-xl px-3 py-2 text-xs font-black ${tone === 'black' ? 'bg-white text-[#2f2415]' : 'bg-[#2f2415] text-white'}`}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function StockOperationalHealthPanel({
  rows = [],
  lots = [],
  animaux = [],
  cultures = [],
  alimentationLogs = [],
  onNavigate,
  onFreezeProduct,
}) {
  const stocks = arr(rows);
  const critical = stocks.filter((row) => seuil(row) > 0 && qty(row) <= seuil(row));

  const dlcAlerts = stocks
    .filter(requiresDlc)
    .map((row) => ({ row, level: dlcAlertLevel(row) }))
    .filter((item) => item.level !== 'ok' && item.level !== 'none');

  const orangeDlc = dlcAlerts.filter((item) => item.level === 'orange' || item.level === 'missing');
  const redDlc = dlcAlerts.filter((item) => item.level === 'red');
  const blackDlc = dlcAlerts.filter((item) => item.level === 'black');

  const feedAlerts = buildFeedCoherenceAlerts({ stocks, lots });
  const productionAlerts = buildProductionCoherenceAlerts({ stocks, lots, animaux, cultures });

  const hasCritical = critical.length || orangeDlc.length || redDlc.length || blackDlc.length || feedAlerts.length || productionAlerts.length;
  if (!hasCritical) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <p className="flex items-center gap-2 font-black text-emerald-800"><Package size={18} /> Stock opérationnel</p>
        <p className="mt-2 text-sm text-emerald-800">Aucune alerte critique : seuils, DLC et cohérence élevage/stock sont sous contrôle.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><AlertTriangle size={15} /> Alertes critiques stock</p>
        <h3 className="text-xl font-black text-[#2f2415] mt-1">Actions immédiates requises</h3>
        <p className="text-sm text-[#8a7456] mt-1">Ruptures, DLC frigo et écarts Élevage ↔ Stock.</p>
      </div>

      {critical.length ? (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase text-[#8a7456]">Rupture / sous seuil ({critical.length})</p>
          {critical.slice(0, 6).map((row) => (
            <AlertCard
              key={row.id}
              tone={qty(row) <= 0 ? 'red' : 'orange'}
              title={`${label(row)} — ${fmtNumber(qty(row))} ${row.unite || ''} (seuil ${fmtNumber(seuil(row))})`}
              detail={`Valeur ligne : ${fmtCurrency(qty(row) * unitPrice(row))}`}
              actionLabel="Ouvrir inventaire"
              onAction={() => onNavigate?.('achats_stock', { tab: 'Stock' })}
            />
          ))}
        </div>
      ) : null}

      {orangeDlc.length ? (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase text-amber-800">DLC — à vendre rapidement (J-3)</p>
          {orangeDlc.slice(0, 5).map(({ row }) => (
            <AlertCard
              key={`orange-${row.id}`}
              tone="orange"
              title={label(row)}
              detail={`DLC ${row.date_peremption || 'non renseignée'} · ${fmtNumber(qty(row))} ${row.unite || ''} · ${row.emplacement || 'emplacement ?'}`}
              actionLabel="Commercial"
              onAction={() => onNavigate?.('commercial', { tab: 'Ventes' })}
            />
          ))}
        </div>
      ) : null}

      {redDlc.length ? (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase text-red-700">DLC — expiration &lt; 24 h</p>
          {redDlc.slice(0, 5).map(({ row }) => (
            <AlertCard
              key={`red-${row.id}`}
              tone="red"
              title={label(row)}
              detail={`DLC ${row.date_peremption} · promotion ou congélation recommandée`}
              actionLabel={onFreezeProduct ? 'Congeler' : 'Voir stock'}
              onAction={() => (onFreezeProduct ? onFreezeProduct(row) : onNavigate?.('achats_stock', { tab: 'Stock' }))}
            />
          ))}
        </div>
      ) : null}

      {blackDlc.length ? (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase text-[#2f2415]">Produits périmés — blocage vente</p>
          {blackDlc.slice(0, 5).map(({ row }) => (
            <AlertCard
              key={`black-${row.id}`}
              tone="black"
              title={label(row)}
              detail={isCommerciallyBlocked(row) ? 'Statut bloqué pour la vente · enregistrer rebut' : 'DLC dépassée'}
              actionLabel="Déclarer rebut"
              onAction={() => onNavigate?.('achats_stock', { tab: 'Stock' })}
            />
          ))}
        </div>
      ) : null}


      {productionAlerts.length ? (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase text-[#8a7456]">Production → stock</p>
          {productionAlerts.slice(0, 5).map((alert) => (
            <AlertCard
              key={alert.id}
              tone={alert.severity === 'red' ? 'red' : 'orange'}
              title={alert.title}
              detail={alert.detail}
              actionLabel={alert.module === 'cultures' ? 'Cultures' : 'Élevage'}
              onAction={() => onNavigate?.(alert.module, alert.tab ? { tab: alert.tab } : undefined)}
            />
          ))}
        </div>
      ) : null}

      {feedAlerts.length ? (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase text-[#8a7456] flex items-center gap-1"><Utensils size={14} /> Cohérence Élevage ↔ Stock</p>
          {feedAlerts.slice(0, 4).map((alert) => (
            <AlertCard
              key={alert.id}
              tone={alert.severity === 'red' ? 'red' : 'orange'}
              title={alert.title}
              detail={alert.detail}
              actionLabel="Ouvrir Élevage"
              onAction={() => onNavigate?.('elevage', { tab: 'Alimentation' })}
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 justify-end text-xs">
        <span className="text-[#8a7456]">{arr(alimentationLogs).length} sortie(s) aliment enregistrées</span>
        <button type="button" onClick={() => onNavigate?.('elevage')} className="rounded-xl border border-[#eadcc2] px-3 py-2 font-bold">Élevage</button>
        {onFreezeProduct ? <span className="inline-flex items-center gap-1 text-[#8a7456]"><Snowflake size={14} /> Congélation disponible sur lignes viande/œufs</span> : null}
        <button type="button" onClick={() => onNavigate?.('achats_stock', { tab: 'Stock' })} className="rounded-xl border border-[#eadcc2] px-3 py-2 font-bold"><RefreshCw size={14} className="inline" /> Inventaire</button>
      </div>
    </section>
  );
}
