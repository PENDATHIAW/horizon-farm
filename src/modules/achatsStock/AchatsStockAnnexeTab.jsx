import { FileText, Paperclip } from 'lucide-react';
import ModuleAnnexeTab from '../../components/module/ModuleAnnexeTab.jsx';
import { fmtCurrency } from '../../utils/format';
import { filterAchatsStockAnnexeDocuments } from '../../utils/achatsStockAnnexeFilter.js';

export default function AchatsStockAnnexeTab({ documents = [], onNavigate }) {
  const annexDocs = filterAchatsStockAnnexeDocuments(documents);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-[#9a6b12]" />
          <div>
            <h2 className="text-lg font-black text-[#2f2415]">Annexe Achats &amp; Stock</h2>
            <p className="text-sm text-[#8a7456]">Factures fournisseurs, bons de réception, preuves d&apos;achat et justificatifs liés au stock.</p>
          </div>
        </div>
        {annexDocs.length ? (
          <ul className="mt-4 space-y-2">
            {annexDocs.slice(0, 24).map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm">
                <div>
                  <p className="font-bold text-[#2f2415]">{doc.title || doc.nom || doc.libelle || 'Document'}</p>
                  <p className="text-xs text-[#8a7456]">
                    {doc.document_category || doc.categorie || doc.category || 'Stock'}
                    {doc.entity_id ? ` · ${doc.entity_id}` : ''}
                  </p>
                </div>
                {doc.montant || doc.amount ? (
                  <span className="text-xs font-black text-[#8a7456]">{fmtCurrency(doc.montant || doc.amount)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-sm text-[#8a7456]">
            <Paperclip size={24} className="mx-auto text-[#9a6b12]" />
            <p className="mt-3 font-black text-[#2f2415]">Aucune annexe Achats &amp; Stock ajoutée pour le moment.</p>
            <p className="mt-1">Les factures et preuves apparaîtront ici après vos réceptions d&apos;achat.</p>
            {onNavigate ? (
              <button
                type="button"
                onClick={() => onNavigate('documents_rapports')}
                className="mt-4 rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-black text-[#2f2415]"
              >
                Ajouter un document
              </button>
            ) : null}
          </div>
        )}
      </section>
      <ModuleAnnexeTab moduleId="achats_stock" onNavigate={onNavigate} />
    </div>
  );
}
