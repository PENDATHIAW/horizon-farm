import { FileText } from 'lucide-react';
import ModuleAnnexeTab from '../../components/module/ModuleAnnexeTab.jsx';
import { fmtCurrency } from '../../utils/format';
import { filterFinanceAnnexeDocuments } from '../../utils/financePilotageCore.js';

export default function FinanceAnnexePanel({ documents = [], onNavigate }) {
  const annexDocs = filterFinanceAnnexeDocuments(documents);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-[#9a6b12]" />
          <div>
            <h2 className="text-lg font-black text-[#2f2415]">Annexe financière</h2>
            <p className="text-sm text-[#8a7456]">Documents, pièces justificatives et preuves liées à Finance & Pilotage.</p>
          </div>
        </div>
        {annexDocs.length ? (
          <ul className="mt-4 space-y-2">
            {annexDocs.slice(0, 20).map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm">
                <div>
                  <p className="font-bold text-[#2f2415]">{doc.title || doc.nom || doc.libelle || 'Document'}</p>
                  <p className="text-xs text-[#8a7456]">{doc.categorie || doc.category || doc.type || 'Finance'}</p>
                </div>
                {doc.montant || doc.amount ? (
                  <span className="text-xs font-black text-[#8a7456]">{fmtCurrency(doc.montant || doc.amount)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-sm text-[#8a7456]">
            Aucune annexe financière ajoutée pour le moment.
            {onNavigate ? (
              <div className="mt-3">
                <button type="button" onClick={() => onNavigate('documents_rapports')} className="rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-black text-[#2f2415]">
                  Ajouter un document
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>
      <ModuleAnnexeTab moduleId="finance_pilotage" onNavigate={onNavigate} />
    </div>
  );
}
