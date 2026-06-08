import { FileText, Paperclip, Truck } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { isQuoteOrder } from '../../utils/commercialQuoteWorkflow.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').toLowerCase();

function docCategory(row = {}) {
  return lower(row.document_category || row.type || row.category || '');
}

export default function CommercialAnnexeTab({
  documents = [],
  orders = [],
  invoices = [],
  deliveries = [],
  clients = [],
  onNavigate,
}) {
  const orderIds = new Set(arr(orders).map((o) => String(o.id)));
  const commercialDocs = arr(documents).filter((doc) => {
    const module = lower(doc.module_source || doc.module || '');
    const entity = String(doc.entity_id || doc.related_id || doc.order_id || '');
    return module.includes('vente') || module.includes('commercial') || orderIds.has(entity)
      || ['facture', 'bon_livraison', 'bl', 'devis', 'preuve'].some((k) => docCategory(doc).includes(k));
  });

  const invoiceRows = arr(invoices).filter((inv) => orderIds.has(String(inv.order_id || inv.sale_id)));
  const deliveryRows = arr(deliveries).filter((d) => orderIds.has(String(d.order_id || d.sale_id)));
  const quoteRows = arr(orders).filter((o) => isQuoteOrder(o));
  const hasData = commercialDocs.length || invoiceRows.length || deliveryRows.length || quoteRows.length;

  if (!hasData) {
    return (
      <div className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-8 text-center">
        <Paperclip size={28} className="mx-auto text-[#9a6b12]" />
        <p className="mt-3 text-lg font-black text-[#2f2415]">Aucune annexe commerciale ajoutée pour le moment.</p>
        <p className="mt-2 text-sm text-[#8a7456]">Factures, bons de livraison, devis et preuves client apparaîtront ici après vos ventes.</p>
        {onNavigate ? (
          <button type="button" onClick={() => onNavigate('documents_rapports', { tab: 'Preuves' })} className="mt-4 rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white">
            Ouvrir Documents & Rapports
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Paperclip size={15} /> Annexe commerciale</p>
        <h2 className="mt-1 text-xl font-black text-[#2f2415]">Preuves, factures et livraisons</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Documents liés aux ventes et clients — preuve pour financeurs et suivi terrain.</p>
      </section>

      {invoiceRows.length ? (
        <section className="rounded-2xl border border-[#eadcc2] bg-white p-4">
          <p className="text-sm font-black text-[#2f2415] flex items-center gap-2"><FileText size={15} /> Factures ({invoiceRows.length})</p>
          <div className="mt-3 divide-y divide-[#eadcc2]/60">
            {invoiceRows.slice(0, 8).map((inv) => (
              <div key={inv.id} className="py-2 flex justify-between gap-2 text-sm">
                <span className="font-bold text-[#2f2415]">{inv.numero_facture || inv.id}</span>
                <span className="text-[#8a7456]">{fmtCurrency(inv.montant_total ?? inv.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {deliveryRows.length ? (
        <section className="rounded-2xl border border-[#eadcc2] bg-white p-4">
          <p className="text-sm font-black text-[#2f2415] flex items-center gap-2"><Truck size={15} /> Bons de livraison ({deliveryRows.length})</p>
          <div className="mt-3 divide-y divide-[#eadcc2]/60">
            {deliveryRows.slice(0, 8).map((d) => (
              <div key={d.id} className="py-2 flex justify-between gap-2 text-sm">
                <span className="font-bold text-[#2f2415]">{d.id} · {d.statut || d.status}</span>
                <span className="text-[#8a7456]">{d.date_livraison || d.date || ''}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {commercialDocs.length ? (
        <section className="rounded-2xl border border-[#eadcc2] bg-white p-4">
          <p className="text-sm font-black text-[#2f2415]">Documents ({commercialDocs.length})</p>
          <div className="mt-3 space-y-2">
            {commercialDocs.slice(0, 10).map((doc) => (
              <div key={doc.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm">
                <p className="font-bold text-[#2f2415]">{doc.title || doc.nom || doc.id}</p>
                <p className="text-xs text-[#8a7456]">{doc.document_category || doc.type || 'document'} · {doc.entity_id || doc.related_id || ''}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {quoteRows.length ? (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-black text-sky-900">Devis archivés ({quoteRows.length})</p>
          <div className="mt-2 space-y-1 text-sm text-sky-900">
            {quoteRows.slice(0, 5).map((q) => (
              <p key={q.id}>{q.id} · {q.client_label || q.client_id} · {fmtCurrency(q.montant_total)}</p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
