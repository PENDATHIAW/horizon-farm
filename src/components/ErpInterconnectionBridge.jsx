import { useEffect, useMemo, useRef } from 'react';
import { runErpInterconnectionRepair } from '../services/erpInterconnectionEngine';

const arr = (value) => (Array.isArray(value) ? value : []);
const rows = (crud) => arr(crud?.rows);

/** Répare automatiquement les interconnexions ERP manquantes au démarrage et après changements critiques. */
export default function ErpInterconnectionBridge({ cruds = {} }) {
  const ranRef = useRef('');
  const signature = useMemo(() => {
    const orders = rows(cruds.sales_orders);
    const payments = rows(cruds.payments);
    const finances = rows(cruds.finances);
    const stocks = rows(cruds.stock);
    const sante = rows(cruds.sante);
    return `${orders.length}-${payments.length}-${finances.length}-${rows(cruds.invoices).length}-${rows(cruds.documents).length}-${stocks.length}-${sante.length}-${rows(cruds.alimentation_logs).length}`;
  }, [cruds]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled || ranRef.current === signature) return;
      ranRef.current = signature;

      void runErpInterconnectionRepair({
        orders: rows(cruds.sales_orders),
        payments: rows(cruds.payments),
        finances: rows(cruds.finances),
        invoices: rows(cruds.invoices),
        documents: rows(cruds.documents),
        opportunities: rows(cruds.sales_opportunities),
        sante: rows(cruds.sante),
        stocks: rows(cruds.stock),
        fournisseurs: rows(cruds.fournisseurs),
        alimentationLogs: rows(cruds.alimentation_logs),
        equipements: rows(cruds.equipements),
        tasks: rows(cruds.taches),
        alertes: rows(cruds.alertes_center),
        handlers: {
          onCreateFinanceTransaction: cruds.finances?.create,
          onUpdateFinanceTransaction: cruds.finances?.update,
          onUpdateOpportunity: cruds.sales_opportunities?.update,
          onCreateDocument: cruds.documents?.create,
          onUpdateDocument: cruds.documents?.update,
          onUpdateHealth: cruds.sante?.update,
          onCreateAlert: cruds.alertes_center?.create,
          onCreateTask: cruds.taches?.create,
          onUpdateStock: cruds.stock?.update,
          onUpdateSupplier: cruds.fournisseurs?.update,
          onCreateBusinessEvent: cruds.business_events?.create,
        },
      }).catch(() => {});
    }, 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [signature, cruds]);

  return null;
}
