import useCrudModule from '../hooks/useCrudModule';
import ImpactBusinessShell from './ImpactBusinessShell.jsx';

const fallbackRows = (provided, crud) => provided?.length ? provided : crud.rows;

export default function ImpactBusiness(props) {
  const culturesCrud = useCrudModule('cultures');
  const clientsCrud = useCrudModule('clients');
  const fournisseursCrud = useCrudModule('fournisseurs');
  const equipementsCrud = useCrudModule('equipements');
  const investissementsCrud = useCrudModule('investissements');
  const businessPlansCrud = useCrudModule('business_plans');
  const bpInvestmentLinesCrud = useCrudModule('bp_investment_lines');
  const bpRecurringCostsCrud = useCrudModule('bp_recurring_costs');
  const bpRevenueProjectionsCrud = useCrudModule('bp_revenue_projections');
  const bpFundingSourcesCrud = useCrudModule('bp_funding_sources');
  const bpLinksCrud = useCrudModule('bp_links');
  const bpRisksCrud = useCrudModule('bp_risks');
  const salesOrderItemsCrud = useCrudModule('sales_order_items');
  const deliveriesCrud = useCrudModule('deliveries');
  const invoicesCrud = useCrudModule('invoices');
  const salesOpportunitiesCrud = useCrudModule('sales_opportunities');
  const sensorDevicesCrud = useCrudModule('sensor_devices');
  const cameraDevicesCrud = useCrudModule('camera_devices');
  const auditLogsCrud = useCrudModule('audit_logs');
  const rapportsCrud = useCrudModule('rapports');
  const veterinairesCrud = useCrudModule('veterinaires');
  const alimentationLogsCrud = useCrudModule('alimentation_logs');
  const productionOeufsLogsCrud = useCrudModule('production_oeufs_logs');

  const mergedProps = {
    ...props,
    cultures: fallbackRows(props.cultures, culturesCrud),
    clients: fallbackRows(props.clients, clientsCrud),
    fournisseurs: fallbackRows(props.fournisseurs, fournisseursCrud),
    equipements: fallbackRows(props.equipements, equipementsCrud),
    investissements: fallbackRows(props.investissements, investissementsCrud),
    businessPlans: fallbackRows(props.businessPlans, businessPlansCrud),
    bpInvestmentLines: fallbackRows(props.bpInvestmentLines, bpInvestmentLinesCrud),
    bpRecurringCosts: fallbackRows(props.bpRecurringCosts, bpRecurringCostsCrud),
    bpRevenueProjections: fallbackRows(props.bpRevenueProjections, bpRevenueProjectionsCrud),
    bpFundingSources: fallbackRows(props.bpFundingSources, bpFundingSourcesCrud),
    bpLinks: fallbackRows(props.bpLinks, bpLinksCrud),
    bpRisks: fallbackRows(props.bpRisks, bpRisksCrud),
    orderItems: fallbackRows(props.orderItems, salesOrderItemsCrud),
    salesOrderItems: fallbackRows(props.salesOrderItems, salesOrderItemsCrud),
    deliveriesList: fallbackRows(props.deliveriesList, deliveriesCrud),
    deliveries: fallbackRows(props.deliveries, deliveriesCrud),
    invoicesList: fallbackRows(props.invoicesList, invoicesCrud),
    invoices: fallbackRows(props.invoices, invoicesCrud),
    opportunities: fallbackRows(props.opportunities, salesOpportunitiesCrud),
    salesOpportunities: fallbackRows(props.salesOpportunities, salesOpportunitiesCrud),
    sensors: fallbackRows(props.sensors, sensorDevicesCrud),
    sensorDevices: fallbackRows(props.sensorDevices, sensorDevicesCrud),
    cameras: fallbackRows(props.cameras, cameraDevicesCrud),
    cameraDevices: fallbackRows(props.cameraDevices, cameraDevicesCrud),
    auditLogs: fallbackRows(props.auditLogs, auditLogsCrud),
    audit_logs: fallbackRows(props.audit_logs, auditLogsCrud),
    rapports: fallbackRows(props.rapports, rapportsCrud),
    reports: fallbackRows(props.reports, rapportsCrud),
    veterinaires: fallbackRows(props.veterinaires, veterinairesCrud),
    vets: fallbackRows(props.vets, veterinairesCrud),
    alimentationLogs: fallbackRows(props.alimentationLogs, alimentationLogsCrud),
    productionLogs: props.productionLogs?.length ? props.productionLogs : productionOeufsLogsCrud.rows,
  };

  return <ImpactBusinessShell {...mergedProps} />;
}
