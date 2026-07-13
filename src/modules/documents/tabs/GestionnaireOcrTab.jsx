import { FileText, FolderOpen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { filterDocumentsByQuery } from '../../../services/documentsOrphanSyncService.js';
import DocumentScannerPanel from '../DocumentScannerPanel.jsx';
import InvoiceOcrIntelligentPanel from '../InvoiceOcrIntelligentPanel.jsx';
import {
  Empty,
  Field,
  Row,
  Section,
  labelOf,
  typeOf,
  dateOf,
  detailOf,
} from '../documentsModuleUi.jsx';

function LibraryGrid({ data, selected, setSelected, query, setQuery }) {
  const filtered = useMemo(() => filterDocumentsByQuery(data.documents, query), [data.documents, query]);
  const row = selected || filtered[0] || data.documents[0];
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
      <Section icon={FolderOpen} title="Bibliothèque" action={
        <div className="relative w-full max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher document…" className="w-full rounded-xl border border-line bg-card py-2 pl-12 pr-3 text-sm" />
        </div>
      }>
        {filtered.length ? filtered.slice(0, 36).map((doc) => (
          <Row
            key={doc.id || labelOf(doc)}
            title={labelOf(doc)}
            detail={`${typeOf(doc)} · ${dateOf(doc)} · ${detailOf(doc)}`}
            value={doc.transaction_id || doc.source_record_id ? 'Lié' : 'À rattacher'}
            tone={doc.transaction_id || doc.source_record_id ? 'good' : 'warn'}
            onClick={() => setSelected(doc)}
          />
        )) : <Empty label={query ? 'Aucun document pour cette recherche.' : 'Aucun document.'} />}
      </Section>
      <Section icon={Search} title="Fiche document">
        <div className="space-y-3">
          {row ? (
            <>
              <Field label="Document" value={labelOf(row)} />
              <Field label="Type" value={typeOf(row)} />
              <Field label="Date" value={dateOf(row)} />
              <Field label="Origine" value={row.module_source || row.related_type || '—'} />
              <Field label="Lien métier" value={row.transaction_id || row.source_record_id || row.order_id || 'Non rattaché'} />
              <Field label="Détail" value={detailOf(row)} />
            </>
          ) : <Empty label="Aucun document sélectionné." />}
        </div>
      </Section>
    </div>
  );
}

function TemplatesSection({ data }) {
  const templates = data.templates.length ? data.templates : [
    { id: 'vente', title: 'Reçu de vente', type: 'Modèle' },
    { id: 'finance', title: 'Justificatif dépense', type: 'Modèle' },
    { id: 'stock', title: 'Fiche inventaire', type: 'Modèle' },
    { id: 'sante', title: 'Fiche sanitaire', type: 'Modèle' },
  ];
  return (
    <Section icon={FileText} title="Modèles de documents">
      {templates.map((row) => (
        <Row key={row.id || labelOf(row)} title={labelOf(row)} detail={`${typeOf(row)} · prêt à utiliser`} value="Modèle" />
      ))}
    </Section>
  );
}

export default function GestionnaireOcrTab({
  data,
  scannerContext,
  scannerHandlers,
  dataMap,
  onNavigate,
  onSuccess,
}) {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [libraryQuery, setLibraryQuery] = useState('');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DocumentScannerPanel context={scannerContext} handlers={scannerHandlers} onSuccess={onSuccess} />
        <InvoiceOcrIntelligentPanel context={scannerContext} dataMap={dataMap} handlers={scannerHandlers} onNavigate={onNavigate} onSuccess={onSuccess} />
      </div>
      <LibraryGrid data={data} selected={selectedDocument} setSelected={setSelectedDocument} query={libraryQuery} setQuery={setLibraryQuery} />
      <TemplatesSection data={data} />
    </div>
  );
}
