import { useEffect, useMemo, useState } from 'react';
import { readPeriodScope } from '../utils/periodScope';
import { getDashboardHealthReport } from './dashboard/dashboardHealthCache';
import { buildDashboardSummary } from './dashboard/dashboardMetrics';
import { buildDashboardPriorities } from './dashboard/dashboardPilotage';
import { dashboardGreeting } from './dashboard/dashboardGreeting';
import { buildCarnetHorizonView } from './dashboard/carnetHorizon';
import CarnetHorizon, { CarnetHorizonHeader } from './dashboard/CarnetHorizon.jsx';

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
const formatDateTime = () => new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date());

function farmLocationOf(props = {}) {
  const farm = props.farm || props.ferme || props.farmProfile || props.farm_profile || {};
  const meteo = props.meteo || props.weather || {};
  const quartier = firstValue(farm.quartier, farm.neighborhood, farm.district, meteo.quartier, meteo.neighborhood, meteo.district);
  const ville = firstValue(farm.ville, farm.city, farm.localite, farm.locality, meteo.ville, meteo.city, meteo.localite, meteo.locality, meteo.location);
  const pays = firstValue(farm.pays, farm.country, meteo.pays, meteo.country);
  const parts = [quartier, ville, pays].filter(Boolean);
  return parts.length ? parts.join(', ') : firstValue(farm.location, farm.localisation, meteo.localisation, meteo.place, 'Ferme principale');
}

function displayUserOf(props = {}) {
  const user = props.user || props.currentUser || {};
  const raw = firstValue(props.displayUser, props.userName, props.username, user.user_metadata?.login, user.user_metadata?.name, user.email?.split('@')[0]);
  if (!raw) return 'Exploitant';
  const text = String(raw).trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildHealthData(props = {}) {
  return {
    sales_orders: props.salesOrdersAll || props.salesOrders,
    payments: props.paymentsAll || props.payments,
    finances: props.transactions,
    stock: props.stocks,
    animaux: props.animaux,
    avicole: props.lotsData || props.lots,
    sante: props.vaccins || props.sante,
    taches: props.taches,
    alertes_center: props.alertes,
    alimentation_logs: props.alimentationLogs,
    production_oeufs_logs: props.productionLogs,
    clients: props.clients,
    fournisseurs: props.fournisseurs,
  };
}

export default function DashboardV2(props) {
  const {
    dataFingerprint,
    salesOrders,
    salesOrdersAll,
    payments,
    paymentsAll,
    transactions,
    transactionsAll,
    productionLogs,
    stocks,
    taches,
    alertes,
    animaux,
    lotsData,
    lots,
    cultures,
    documents,
    alimentationLogs,
    vaccins,
    sante,
    meteo,
    businessEvents,
    farm,
    ferme,
    clients,
    fournisseurs,
    periodScope: periodScopeProp,
    periodLabel,
    user,
    displayUser,
    userName,
    username,
  } = props;

  const periodScope = periodScopeProp || readPeriodScope();
  const dateTime = useMemo(() => formatDateTime(), []);
  const greetingProps = useMemo(() => ({
    user,
    displayUser,
    userName,
    username,
  }), [user, displayUser, userName, username]);
  const greeting = useMemo(() => dashboardGreeting(greetingProps), [greetingProps]);

  const healthData = useMemo(
    () => buildHealthData({
      salesOrdersAll,
      salesOrders,
      paymentsAll,
      payments,
      transactions,
      stocks,
      animaux,
      lotsData,
      lots,
      vaccins,
      sante,
      taches,
      alertes,
      alimentationLogs,
      productionLogs,
      clients,
      fournisseurs,
    }),
    [
      salesOrdersAll,
      salesOrders,
      paymentsAll,
      payments,
      transactions,
      stocks,
      animaux,
      lotsData,
      lots,
      vaccins,
      sante,
      taches,
      alertes,
      alimentationLogs,
      productionLogs,
      clients,
      fournisseurs,
    ],
  );
  const health = useMemo(
    () => getDashboardHealthReport(dataFingerprint, () => healthData),
    [dataFingerprint, healthData],
  );

  const summaryProps = useMemo(() => ({
    salesOrders,
    salesOrdersAll,
    payments,
    paymentsAll,
    transactions,
    transactionsAll,
    stocks,
    taches,
    alertes,
    animaux,
    lotsData,
    lots,
    cultures,
    productionLogs,
    documents,
    alimentationLogs,
    vaccins,
    sante,
    meteo,
    fournisseurs,
    farm,
    ferme,
    clients,
    businessEvents,
  }), [
    salesOrders,
    salesOrdersAll,
    payments,
    paymentsAll,
    transactions,
    transactionsAll,
    stocks,
    taches,
    alertes,
    animaux,
    lotsData,
    lots,
    cultures,
    productionLogs,
    documents,
    alimentationLogs,
    vaccins,
    sante,
    meteo,
    fournisseurs,
    farm,
    ferme,
    clients,
    businessEvents,
  ]);

  const summary = useMemo(
    () => buildDashboardSummary(summaryProps, periodScope),
    [summaryProps, periodScope],
  );

  const pilotageProps = useMemo(() => ({
    ...summaryProps,
    salesOrdersAll: salesOrdersAll || salesOrders,
    paymentsAll: paymentsAll || payments,
    transactionsAll: transactionsAll || transactions,
  }), [summaryProps, salesOrdersAll, salesOrders, paymentsAll, payments, transactionsAll, transactions]);

  const priorities = useMemo(
    () => buildDashboardPriorities(summary, pilotageProps, health),
    [summary, pilotageProps, health],
  );

  const carnet = useMemo(
    () => buildCarnetHorizonView({ summary, priorities, props: pilotageProps }),
    [summary, priorities, pilotageProps],
  );

  return (
    <div className="space-y-5 dashboard-carnet-root">
      <CarnetHorizonHeader
        greeting={greeting || `Bonjour ${displayUserOf(props)}`}
        location={farmLocationOf(props)}
        dateTime={dateTime}
        periodLabel={periodLabel}
      />
      <CarnetHorizon carnet={carnet} />
    </div>
  );
}
