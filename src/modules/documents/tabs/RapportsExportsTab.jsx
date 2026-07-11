import { BarChart3, Download } from 'lucide-react';
import ModuleGraphiquesTab from '../../../components/module/ModuleGraphiquesTab.jsx';
import CircularEconomyKpiPanel from '../../../components/greenpreneurs/CircularEconomyKpiPanel.jsx';
import GreenpreneursReadinessCard from '../../../components/greenpreneurs/GreenpreneursReadinessCard.jsx';
import { computeGreenpreneursMetrics } from '../../../services/greenpreneurs/greenpreneursMetrics.js';
import { fmtNumber } from '../../../utils/format';
import { isSimulatedDataModeEnabled } from '../../../utils/uiPreferences.js';
import { Button, Empty, Field, Row, Section, labelOf, typeOf, dateOf, detailOf } from '../documentsModuleUi.jsx';

export default function RapportsExportsTab({
  data,
  periodFiltered,
  onNavigate,
  greenpreneursExtras = {},
}) {
  const greenpreneursDataMap = {
    documents: data.documents,
    transactions: data.transactions,
    finances: data.transactions,
    sales_orders: data.salesOrders,
    payments: data.payments,
    stocks: data.stocks,
    cultures: data.cultures,
    animaux: data.animaux,
    avicole: data.lots,
    business_events: data.businessEvents,
    clients: data.clients,
    fournisseurs: data.fournisseurs,
    business_plans: data.businessPlans,
    investissements: data.investissements,
    ...greenpreneursExtras,
  };
  const gp = computeGreenpreneursMetrics(greenpreneursDataMap, { simulatedMode: isSimulatedDataModeEnabled() });

  return (
    <div className="space-y-5">
      <GreenpreneursReadinessCard
        dataMap={greenpreneursDataMap}
        simulatedMode={isSimulatedDataModeEnabled()}
        onNavigate={onNavigate}
      />
      <CircularEconomyKpiPanel
        dataMap={greenpreneursDataMap}
        simulatedMode={isSimulatedDataModeEnabled()}
        compact
      />
      <Section icon={Download} title="Feuille de route data-driven (DER/FJ)">
        <p className="text-sm text-[#8a7456] leading-relaxed">{gp.valorisation.roadmapNote}</p>
        <p className="mt-2 text-sm text-[#2f2415]">
          Tallow & Go : <b>{gp.valorisation.phase2_tallow_go.score}/100</b> ({gp.valorisation.phase2_tallow_go.statusLabel}) ·
          BOVINIA : <b>{gp.valorisation.phase3_bovinia.score}/100</b> ({gp.valorisation.phase3_bovinia.statusLabel})
        </p>
      </Section>
      <Section icon={Download} title="Exports & dossier financeur">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-emerald-900">Dossier financeur PDF</p>
            <p className="text-sm text-emerald-800">DER, FONGIP, BNDE, CNCAS — actifs, production, CA, rentabilité, risques et prévisions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button primary onClick={() => onNavigate?.('investisseurs_forums', { tab: 'export' })}>Générer pack investisseur</Button>
            <Button onClick={() => onNavigate?.('rapports')}>Dossier financeur (legacy)</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Export ventes" value={`${fmtNumber(data.salesOrders.length)} vente(s)`} />
          <Field label="Export finance" value={`${fmtNumber(data.transactions.length)} mouvement(s)`} />
          <Field label="Export élevage" value={`${fmtNumber(data.animaux.length + data.lots.length)} élément(s)`} />
          <Field label="Export stock" value={`${fmtNumber(data.stocks.length)} produit(s)`} />
          <Field label="Export cultures" value={`${fmtNumber(data.cultures.length)} culture(s)`} />
          <Field label="Export clients" value={`${fmtNumber(data.clients.length)} client(s)`} />
        </div>
      </Section>
      <Section icon={BarChart3} title="Rapports archivés">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 mb-4">
          <Field label="Rapports" value={fmtNumber(data.reports.length)} />
          <Field label="Modules couverts" value={fmtNumber(data.coveredModules.length)} />
          <Field label="Exports" value={fmtNumber(data.exports.length)} />
          <Field label="Modèles" value={fmtNumber(data.templates.length)} />
        </div>
        {data.reports.length ? data.reports.slice(0, 14).map((row) => (
          <Row key={row.id || labelOf(row)} title={labelOf(row)} detail={`${typeOf(row)} · ${dateOf(row)} · ${detailOf(row)}`} value="Rapport" />
        )) : <Empty label="Aucun rapport enregistré." />}
      </Section>
      <Section icon={BarChart3} title="Couverture analytique">
        <p className="mb-4 text-sm text-[#8a7456]">Évolutions finance et clients intégrées — l’onglet Graphiques technique est fusionné ici.</p>
        <ModuleGraphiquesTab
          moduleId="documents_rapports"
          periodFiltered={periodFiltered}
          transactions={data.transactions}
          finances={data.transactions}
          clients={data.clients}
          salesOrders={data.salesOrders}
          payments={data.payments}
          onNavigate={onNavigate}
        />
      </Section>
    </div>
  );
}
