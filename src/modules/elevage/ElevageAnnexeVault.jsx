import { FileText, Link2 } from 'lucide-react';
import { useMemo } from 'react';
import FarmCostSettingsPanel from '../../components/FarmCostSettingsPanel.jsx';
import { UNIFIED_COST_FORMULA } from '../../services/unifiedCostService.js';
import { ELEVAGE_DOC_CATEGORIES, groupElevageDocuments } from '../../utils/elevageDocumentVault.js';
import { ElevageLogRow, ElevageSection } from './elevageUi.jsx';

export default function ElevageAnnexeVault({
  documents = [],
  animaux = [],
  lots = [],
  onNavigate,
}) {
  const grouped = useMemo(
    () => groupElevageDocuments(documents, { animaux, lots }),
    [documents, animaux, lots],
  );

  const totalDocs = ELEVAGE_DOC_CATEGORIES.reduce((s, c) => s + (grouped[c.id]?.length || 0), 0);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2">
          <FileText size={15} /> Coffre documentaire Élevage
        </p>
        <h2 className="mt-1 text-xl font-black text-[#2f2415]">{totalDocs} document(s) classé(s)</h2>
        <p className="mt-1 text-sm text-[#8a7456]">
          Sanitaire, naissance, transformation, certification, administratif — rattachement animal ou lot quand disponible.
        </p>
      </section>

      {ELEVAGE_DOC_CATEGORIES.map((cat) => {
        const rows = grouped[cat.id] || [];
        if (!rows.length) return null;
        return (
          <ElevageSection key={cat.id} title={cat.label} subtitle={`${rows.length} pièce(s)`}>
            {rows.slice(0, 12).map((doc) => (
              <ElevageLogRow
                key={doc.id}
                title={doc.title || doc.id}
                detail={`${doc.linkLabel} · ${doc.module_source || '—'}${doc.file_url ? ' · preuve' : ''}`}
                value={String(doc.date || doc.created_at || '').slice(0, 10)}
              />
            ))}
          </ElevageSection>
        );
      })}

      {!totalDocs ? (
        <p className="rounded-xl border border-[#eadcc2] bg-white px-4 py-3 text-sm text-[#8a7456]">
          Aucun document Élevage — joignez des preuves depuis Santé, Reproduction ou Transformation.
        </p>
      ) : null}

      <details className="rounded-2xl border border-[#eadcc2] bg-white p-4">
        <summary className="cursor-pointer font-black text-sm text-[#2f2415] flex items-center gap-2">
          <Link2 size={15} /> Paramètres coûts unifiés (Annexe technique)
        </summary>
        <div className="mt-4 space-y-4">
          <FarmCostSettingsPanel />
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm whitespace-pre-wrap">{UNIFIED_COST_FORMULA}</div>
          {onNavigate ? (
            <button type="button" onClick={() => onNavigate('finance_pilotage', { tab: 'Rentabilité' })} className="min-h-[48px] rounded-xl border border-[#d6c3a0] px-4 text-xs font-black">
              Valorisation Finance →
            </button>
          ) : null}
        </div>
      </details>
    </div>
  );
}
