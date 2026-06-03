import { TrendingUp } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { dateOf, label, Btn, DataRow, DataTable, Empty, Section, TabIntro, VISION_TABLE_COLS, VisionKpi } from './visionUtils';

export default function VisionOpportunitiesTab({ data, onNavigate }) {
  const iaRows = data.iaOpportunities || [];
  const commercial = data.openOpportunities || [];
  const pipelineTotal = data.pipelineTotal || 0;

  return (
    <div className="space-y-5">
      <TabIntro
        title="Pipeline & gains possibles"
        detail="Opportunités commerciales ouvertes et suggestions IA non critiques."
        action={onNavigate ? <Btn onClick={() => onNavigate('commercial', { tab: 'Opportunités' })}>Module Commercial</Btn> : null}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Pipeline ouvert" value={fmtCurrency(pipelineTotal)} tone={pipelineTotal ? 'good' : 'neutral'} onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })} />
        <VisionKpi label="Opportunités actives" value={commercial.length} tone={commercial.length ? 'good' : 'neutral'} />
        <VisionKpi label="Suggestions IA" value={iaRows.length} tone={iaRows.length ? 'good' : 'neutral'} />
        <VisionKpi label="Créances à convertir" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} onClick={() => onNavigate?.('commercial', { tab: 'Clients' })} />
      </div>
      {iaRows.length ? (
        <Section icon={TrendingUp} title="Opportunités suggérées par l'IA">
          <DataTable columns={['Suggestion', 'Action recommandée', 'Confiance', 'Actions']}>
            {iaRows.map((r) => (
              <DataRow
                key={r.id}
                title={r.title}
                detail={r.notes || 'Action recommandée'}
                status={`${r.probability || '—'}%`}
                tone="good"
                onClick={() => onNavigate?.(r.module || 'commercial', { tab: 'Résumé' })}
                actions={<button type="button" onClick={() => onNavigate?.(r.module || 'commercial', { tab: 'Résumé' })} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Voir module</button>}
              />
            ))}
          </DataTable>
        </Section>
      ) : null}
      <Section icon={TrendingUp} title="Pipeline commercial ouvert">
        {commercial.length ? (
          <DataTable columns={['Opportunité', 'Client · date · probabilité', 'Montant', 'Actions']}>
            {commercial.slice(0, 20).map((r) => (
              <DataRow
                key={r.id || label(r)}
                title={label(r)}
                detail={`${r.client_nom || r.customer_name || r.notes || 'Sans client'} · ${dateOf(r)} · ${r.probability || r.probabilite || '—'}%`}
                status={fmtCurrency(r.montant_estime || r.estimated_amount || r.montant || 0)}
                tone="good"
                onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })}
                actions={<>
                  <button type="button" onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Gérer</button>
                  <button type="button" onClick={() => redirectToSource(onNavigate, 'vente_commercial_finance', { tab: 'Ventes' })} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700">Ouvrir Commercial</button>
                </>}
              />
            ))}
          </DataTable>
        ) : (
          <Empty>
            Aucune opportunité commerciale ouverte.
            {data.opportunities?.length ? ' Les opportunités fermées sont masquées — ouvrez le module Commercial pour l’historique.' : ' Les suggestions IA apparaissent quand le moteur détecte des gains possibles.'}
          </Empty>
        )}
      </Section>
    </div>
  );
}
