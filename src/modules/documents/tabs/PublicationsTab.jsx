import { Send } from 'lucide-react';
import { Empty, Row, dateOf, detailOf, labelOf } from '../documentsModuleUi.jsx';

const published = (row = {}) => ['publie', 'publié', 'published'].includes(String(row.status || row.statut || '').toLowerCase());

export default function PublicationsTab({ reports = [] }) {
  const rows = reports.filter(published);
  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-earth"><Send size={19} /> Publications</h2>
      <p className="mb-4 text-sm text-slate">Rapports gelés puis diffusés par un canal identifié.</p>
      {rows.length ? rows.map((row) => <Row key={row.id} title={labelOf(row)} detail={`${row.publication_channel || 'Canal non renseigné'} · ${dateOf(row)} · ${detailOf(row)}`} value={`v${row.version_number || 1}`} />) : <Empty label="Aucun rapport publié." />}
    </section>
  );
}
