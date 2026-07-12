import { useState } from 'react';
import toast from 'react-hot-toast';
import { TrendingUp } from 'lucide-react';
import { buildOpportunityFollowUpTask, navigateFromPilotageItem } from '../../utils/centreDecisionWorkflow.js';
import { fmtCurrency } from '../../utils/format';
import { redirectToSource } from '../../utils/antiDuplicationGuard.js';
import { dateOf, label, Btn, DataRow, DataTable, Empty, Section, TabIntro, VisionKpi } from './visionUtils';

export default function VisionOpportunitiesTab({
  data,
  onNavigate,
  onCreateTask,
  onCreateBusinessEvent,
  onRefreshTasks,
}) {
  const [busyId, setBusyId] = useState(null);
  const iaRows = data.iaOpportunities || [];
  const commercial = data.openOpportunities || [];
  const pipelineTotal = data.pipelineTotal || 0;

  const openCommercialOpportunity = (row) => {
    navigateFromPilotageItem(onNavigate, {
      domain: 'Commercial',
      module: 'commercial',
      navTab: 'Opportunités',
      source_module: 'commercial',
      source_record_id: row.id || row.opportunity_id,
      opportunity_id: row.id || row.opportunity_id,
    });
  };

  const createRecommendation = async (row) => {
    if (!onCreateTask) {
      openCommercialOpportunity(row);
      return;
    }
    const rowId = row.id || label(row);
    setBusyId(rowId);
    try {
      const built = buildOpportunityFollowUpTask(row);
      if (!built?.task) throw new Error('Impossible de construire la recommandation');
      await onCreateTask(built.task);
      if (built.event && onCreateBusinessEvent) await onCreateBusinessEvent(built.event);
      await onRefreshTasks?.();
      toast.success('Recommandation créée — gérer la vente dans Commercial');
    } catch (e) {
      toast.error(e.message || 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <TabIntro
        title="Pipeline & gains possibles"
        detail="Opportunités commerciales ouvertes et suggestions — le pilotage oriente vers Commercial, sans saisie vente directe."
        action={onNavigate ? <Btn onClick={() => onNavigate('commercial', { tab: 'Opportunités' })}>Module Commercial</Btn> : null}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Pipeline ouvert" value={fmtCurrency(pipelineTotal)} tone={pipelineTotal ? 'good' : 'neutral'} onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })} />
        <VisionKpi label="Opportunités actives" value={commercial.length} tone={commercial.length ? 'good' : 'neutral'} onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })} />
        <VisionKpi label="Suggestions" value={iaRows.length} tone={iaRows.length ? 'good' : 'neutral'} />
        <VisionKpi label="Créances à convertir" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} onClick={() => onNavigate?.('commercial', { tab: 'Clients & créances' })} />
      </div>
      {iaRows.length ? (
        <Section icon={TrendingUp} title="Opportunités suggérées par l'analyse">
          <DataTable columns={['Suggestion', 'Action recommandée', 'Confiance', 'Actions']}>
            {iaRows.map((r) => (
              <DataRow
                key={r.id}
                title={r.title}
                detail={r.notes || 'Action recommandée'}
                status={`${r.probability || '—'}%`}
                tone="good"
                onClick={() => navigateFromPilotageItem(onNavigate, { module: r.module || 'commercial', navTab: 'Pilotage' })}
                actions={<button type="button" onClick={() => navigateFromPilotageItem(onNavigate, { module: r.module || 'commercial', navTab: 'Pilotage' })} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Voir module</button>}
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
                detail={`${r.client_nom || r.customer_name || r.notes || 'Sans client'} · ${dateOf(r)} · ${r.probability || r.probabilite || '—'}% · lié Commercial`}
                status={fmtCurrency(r.montant_estime || r.estimated_amount || r.montant || 0)}
                tone="good"
                onClick={() => openCommercialOpportunity(r)}
                actions={<>
                  <button type="button" onClick={() => openCommercialOpportunity(r)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Gérer</button>
                  <button type="button" disabled={busyId === (r.id || label(r))} onClick={() => createRecommendation(r)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700 disabled:opacity-50">Recommandation</button>

                </>}
              />
            ))}
          </DataTable>
        ) : (
          <Empty>
            Aucune opportunité commerciale ouverte.
            {data.opportunities?.length ? ' Les opportunités fermées sont masquées — ouvrez le module Commercial pour l’historique.' : ' Les suggestions apparaissent quand le moteur détecte des gains possibles.'}
          </Empty>
        )}
      </Section>
    </div>
  );
}
