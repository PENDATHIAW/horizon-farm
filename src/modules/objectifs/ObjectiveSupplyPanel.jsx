import { Package, Truck, Users } from 'lucide-react';
import { buildSupplierDecisionSummary } from '../../services/supplierDecisionEngine.js';
import { buildClientSegmentation } from '../../services/clientSegmentationEngine.js';
import { fmtCurrency, fmtNumber } from '../../utils/format';

const arr = (v) => (Array.isArray(v) ? v : []);

function Mini({ icon: Icon, label, value, tone = 'neutral' }) {
  const cls = tone === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]';
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <Icon size={14} className="text-[#9a6b12]" />
      <p className="text-[10px] text-[#8a7456] mt-1">{label}</p>
      <p className="font-black text-[#2f2415]">{value}</p>
    </div>
  );
}

export default function ObjectiveSupplyPanel({ dataMap = {}, onNavigate, compact = false }) {
  const suppliers = buildSupplierDecisionSummary(arr(dataMap.fournisseurs), dataMap);
  const clientSeg = buildClientSegmentation(arr(dataMap.clients), dataMap);
  const segments = clientSeg.segments || [];
  const dueClients = segments.filter((c) => c.isDueForReorder);
  const stockRows = arr(dataMap.stock || dataMap.stocks);
  const stockQty = stockRows.reduce((s, r) => s + Number(r.quantite ?? r.quantity ?? 0), 0);
  const criticalStock = stockRows.filter((r) => Number(r.quantite ?? r.quantity ?? 0) <= Number(r.seuil_alerte ?? r.min_qty ?? 0)).length;

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      {!compact ? (
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Fidélisation, fournisseurs & stock</p>
          <h3 className="text-xl font-black text-[#2f2415] mt-1">Sécuriser la demande côté clients, approvisionnement et inventaire</h3>
          <p className="text-sm text-[#8a7456] mt-1">Croisement clients actifs, fournisseurs critiques et tension stock pour prioriser achats et relances.</p>
        </div>
      ) : (
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Détail clients, fournisseurs & stock</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        <Mini icon={Users} label="Clients actifs" value={fmtNumber(clientSeg.totals?.clients ?? 0)} />
        <Mini icon={Users} label="À relancer" value={fmtNumber(dueClients.length)} tone="warn" />
        <Mini icon={Truck} label="Fournisseurs stratégiques" value={fmtNumber(suppliers.strategic?.length ?? 0)} />
        <Mini icon={Truck} label="Risques fournisseurs" value={fmtNumber(suppliers.risks?.length ?? 0)} tone="warn" />
        <Mini icon={Package} label="Stock total (unités)" value={fmtNumber(stockQty)} />
        <Mini icon={Package} label="Alertes stock" value={fmtNumber(criticalStock)} tone={criticalStock ? 'warn' : 'neutral'} />
      </div>

      {!compact ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-2">
            <p className="font-black text-[#2f2415]">Fidélisation clients</p>
            {segments.filter((c) => c.loyaltyScore >= 70).slice(0, 3).map((c) => (
              <p key={c.id} className="text-xs text-[#7d6a4a]">
                <b>{c.name || c.nom}</b> — {c.frequencyLabel || c.segment || 'client'} · {fmtCurrency(c.ca || 0)}
              </p>
            ))}
            {!segments.length ? (
              <p className="text-xs text-[#8a7456]">Ajoutez des clients et ventes pour activer la segmentation.</p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-2">
            <p className="font-black text-[#2f2415]">Fournisseurs & stock</p>
            {(suppliers.risks || suppliers.strategic || []).slice(0, 4).map((s) => (
              <p key={s.id} className="text-xs text-[#7d6a4a]">
                <b>{s.name}</b> — {s.segment} · {s.action}
              </p>
            ))}
            {!suppliers.profiles?.length ? (
              <p className="text-xs text-[#8a7456]">Renseignez fournisseurs et mouvements stock.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onNavigate?.('commercial', { tab: 'Clients & créances' })} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]">Clients & créances</button>
        <button type="button" onClick={() => onNavigate?.('achats_stock', { tab: 'Fournisseurs & dettes' })} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]">Fournisseurs & dettes</button>
        <button type="button" onClick={() => onNavigate?.('achats_stock', { tab: 'Inventaire' })} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]">Inventaire</button>
      </div>
    </section>
  );
}
