import { FileText } from 'lucide-react';
import ModuleAnnexeTab from '../../components/module/ModuleAnnexeTab.jsx';
import { fmtCurrency } from '../../utils/format';
import { filterFinanceAnnexeDocuments } from '../../utils/financePilotageCore.js';

export default function FinanceAnnexePanel({ documents = [], onNavigate }) {
  const annexDocs = filterFinanceAnnexeDocuments(documents);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-horizon-dark" />
          <div>
            <h2 className="text-lg font-semibold text-earth">Annexe financière</h2>
            <p className="text-sm text-slate">Documents, pièces justificatives et preuves liées à Finance & Pilotage.</p>
          </div>
        </div>
        {annexDocs.length ? (
          <ul className="mt-4 space-y-2">
            {annexDocs.slice(0, 20).map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-xl border border-line bg-card px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold text-earth">{doc.title || doc.nom || doc.libelle || 'Document'}</p>
                  <p className="text-xs text-slate">{doc.categorie || doc.category || doc.type || 'Finance'}</p>
                </div>
                {doc.montant || doc.amount ? (
                  <span className="text-xs font-semibold text-slate">{fmtCurrency(doc.montant || doc.amount)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl border border-line bg-card p-6 text-center text-sm text-slate">
            Aucune annexe financière ajoutée pour le moment.
            {onNavigate ? (
              <div className="mt-3">
                <button type="button" onClick={() => onNavigate('documents_rapports')} className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-earth">
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
