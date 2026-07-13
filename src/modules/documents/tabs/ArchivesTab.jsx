import { Archive } from 'lucide-react';
import { Empty, Row, dateOf, detailOf, labelOf } from '../documentsModuleUi.jsx';

const archived = (row = {}) => ['gele', 'gelé', 'frozen', 'publie', 'publié', 'published', 'archive', 'archivé'].includes(String(row.status || row.statut || '').toLowerCase());

export default function ArchivesTab({ reports = [] }) {
  const rows = reports.filter(archived).sort((a, b) => String(b.frozen_at || b.published_at || b.created_at || '').localeCompare(String(a.frozen_at || a.published_at || a.created_at || '')));
  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-earth"><Archive size={19} /> Archives immuables</h2>
      <p className="mb-4 text-sm text-slate">Les rapports gelés restent consultables. Toute correction crée une nouvelle version.</p>
      {rows.length ? rows.map((row) => <Row key={row.id} title={labelOf(row)} detail={`${dateOf(row)} · ${detailOf(row)}`} value={`v${row.version_number || 1}`} />) : <Empty label="Aucun rapport gelé ou publié." />}
    </section>
  );
}
