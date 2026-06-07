import { BarChart3 } from 'lucide-react';
import AntiDuplicationNotice from '../../components/AntiDuplicationNotice.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { Btn, DataRow, DataTable, Empty, Section, TabIntro, VisionKpi } from './visionUtils';

export default function VisionPerformanceTab({ data, onNavigate }) {
  const treasury = data.treasuryResult ?? data.balance;
  const encaisse = data.encaisseDisplay ?? data.collected;
  const goal = data.growthGoal || {};

  return (
    <div className="space-y-5">
      <AntiDuplicationNotice pairId="rentabilite_finance_elevage" onNavigate={onNavigate} actionLabel="Finance → Rentabilité" className="mb-2" />
      <TabIntro
        title="Performance & rentabilité"
        detail={data.periodLabel ? `Indicateurs sur ${data.periodLabel} — créances calculées sur l'historique complet des ventes.` : 'Vue consolidée CA, encaissements, charges et créances.'}
        action={onNavigate ? <Btn onClick={() => onNavigate('finance_pilotage', { tab: 'Rentabilité' })}>Finance → Rentabilité</Btn> : null}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Chiffre d'affaires" value={fmtCurrency(data.salesAmount)} tone="good" onClick={() => onNavigate?.('commercial', { tab: 'Résumé' })} />
        <VisionKpi label="Objectif période" value={fmtCurrency(goal.monthTarget || 0)} tone={(goal.attainment || 0) >= 100 ? 'good' : 'warn'} detail={`${fmtNumber(goal.attainment || 0)}% atteint`} onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Plans' })} />
        <VisionKpi label="Reste à réaliser" value={fmtCurrency(goal.remaining || 0)} tone={goal.remaining ? 'warn' : 'good'} detail="Business plan officiel" onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Prévisions' })} />
        <VisionKpi label="Encaissements" value={fmtCurrency(encaisse)} tone="good" detail={data.periodFiltered ? 'Période' : 'Cumul'} onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} />
        <VisionKpi label="Résultat trésorerie" value={fmtCurrency(treasury)} tone={treasury >= 0 ? 'good' : 'bad'} onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Créances" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} onClick={() => onNavigate?.('commercial', { tab: 'Clients' })} />
        <VisionKpi label="Charges" value={fmtCurrency(data.expenses)} tone="warn" />
        <VisionKpi label="Marge comptable" value={fmtCurrency(data.grossMargin)} tone={data.grossMargin >= 0 ? 'good' : 'bad'} />
        <VisionKpi label="Marges non fiables" value={fmtNumber(data.unreliableMargins || 0)} tone={data.unreliableMargins ? 'warn' : 'good'} />
      </div>
      {data.unreliableMargins > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <b>{data.unreliableMargins}</b> marge(s) masquée(s) — coûts incomplets. Complétez alimentation, santé, transport et revenus avant pilotage rentabilité.
          <button type="button" onClick={() => onNavigate?.('elevage', { tab: 'Résumé' })} className="ml-2 rounded-lg border border-amber-300 px-2 py-1 text-xs font-black">Élevage</button>
        </div>
      ) : null}
      <Section icon={BarChart3} title="Lecture par domaine">
        <DataTable columns={['Domaine', 'Lecture', 'Statut', 'Actions']}>
          <DataRow title="Commercial" detail={`${fmtNumber(data.sales.length)} vente(s) · ${fmtNumber(data.clients.length)} client(s) · CA ${fmtCurrency(data.salesAmount)}`} status={data.receivable ? 'Créances' : 'OK'} tone={data.receivable ? 'warn' : 'good'} onClick={() => onNavigate?.('commercial', { tab: 'Résumé' })} actions={<button type="button" onClick={() => onNavigate?.('commercial', { tab: 'Clients' })} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Ouvrir</button>} />
          <DataRow title="Finance" detail={`Encaissé ${fmtCurrency(encaisse)} · charges ${fmtCurrency(data.expenses)} · résultat ${fmtCurrency(treasury)}`} status={treasury >= 0 ? 'Stable' : 'Tension'} tone={treasury >= 0 ? 'good' : 'bad'} onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} actions={<button type="button" onClick={() => onNavigate?.('finance_pilotage', { tab: 'Créances' })} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Créances</button>} />
          <DataRow title="Production" detail={`${fmtNumber(data.animaux.length)} animaux · ${fmtNumber(data.lots.length)} lots · stock valorisé ${fmtCurrency(data.stockValue)}`} status="Suivi" tone="good" onClick={() => onNavigate?.('elevage', { tab: 'Résumé' })} actions={<button type="button" onClick={() => onNavigate?.('achats_stock', { tab: 'Stock' })} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Stock</button>} />
          <DataRow title="Documents" detail={`${fmtNumber(data.missingProof)} opération(s) sans justificatif`} status={data.missingProof ? 'Preuves' : 'OK'} tone={data.missingProof ? 'warn' : 'good'} onClick={() => onNavigate?.('documents_rapports', { tab: 'Preuves' })} actions={<button type="button" onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Financeurs' })} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Financeurs</button>} />
        </DataTable>
        {!data.sales.length && !data.income ? <Empty>Ajoutez des ventes et transactions pour enrichir la performance.</Empty> : null}
      </Section>
    </div>
  );
}
