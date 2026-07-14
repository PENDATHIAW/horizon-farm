import { BookOpen, FileText } from 'lucide-react';

export default function CulturesAnnexeTab({ documents = [], onNavigate }) {
  const cultureDocs = documents.filter((doc) => {
    const text = `${doc.module_source || ''} ${doc.document_category || ''} ${doc.title || ''}`.toLowerCase();
    return text.includes('culture') || text.includes('parcelle') || text.includes('sol') || text.includes('phyto');
  }).slice(0, 12);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-card p-6">
        <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><BookOpen size={15} /> Annexe Cultures</p>
        <h2 className="mt-1 text-xl font-semibold text-earth">Documents & preuves</h2>
        <p className="mt-1 text-sm text-slate">
          Certificats, analyses sol, contrats, rapports techniques, autorisations phytosanitaires - pas de donnée métier principale ici.
        </p>
      </section>
      <section className="rounded-2xl border border-line bg-white p-4 space-y-2">
        <p className="font-semibold text-earth text-sm flex items-center gap-2"><FileText size={15} /> Documents liés cultures</p>
        {cultureDocs.length ? cultureDocs.map((doc) => (
          <div key={doc.id} className="rounded-xl border border-line px-3 py-2 text-sm">
            <b>{doc.title || doc.id}</b>
            <p className="text-xs text-slate">{doc.document_category || doc.module_source || '-'}</p>
          </div>
        )) : <p className="text-sm text-slate">Aucun document classé cultures - joignez depuis Documents & Rapports.</p>}
        {onNavigate ? (
          <button type="button" onClick={() => onNavigate('documents_rapports', { tab: 'Bibliothèque' })} className="mt-2 text-xs font-semibold text-positive underline">
            Ouvrir bibliothèque documents
          </button>
        ) : null}
      </section>
    </div>
  );
}
