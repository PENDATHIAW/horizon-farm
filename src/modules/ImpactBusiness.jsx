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
  const bpFundingSourcesCrud = useCrudModule('bp_funding_sources');
  const bpRisksCrud = useCrudModule('bp_risks');
  const salesOrderItemsCrud = useCrudModule('sales_order_items');
  const deliveriesCrud = useCrudModule('deliveries');
  const invoicesCrud = useCrudModule('invoices');
  const salesOpportunitiesCrud = useCrudModule('sales_opportunities');
  const sensorDevicesCrud = useCrudModule('sensor_devices');
  const cameraDevicesCrud = useCrudModule('camera_devices');
  const auditLogsCrud = useCrudModule('audit_logs');
  const rapportsCrud = useCrudModule('rapports');

  const mergedProps = {
    ...props,
    cultures: fallbackRows(props.cultures, culturesCrud),
    clients: fallbackRows(props.clients, clientsCrud),
    fournisseurs: fallbackRows(props.fournisseurs, fournisseursCrud),
    equipements: fallbackRows(props.equipements, equipementsCrud),
    investissements: fallbackRows(props.investissements, investissementsCrud),
    businessPlans: fallbackRows(props.businessPlans, businessPlansCrud),
    bpFundingSources: fallbackRows(props.bpFundingSources, bpFundingSourcesCrud),
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
  };

  return <ImpactBusinessShell {...mergedProps} />;
}
