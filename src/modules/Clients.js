import React, { useState } from 'react';
import CollapsibleAdvancedSection from '../components/CollapsibleAdvancedSection.jsx';
import ClientsBase from './Clients.jsx';
import ClientQualityControl from './ClientQualityControl.jsx';

export default function Clients(props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  return React.createElement(
    'div',
    { className: 'space-y-6' },
    React.createElement(ClientsBase, props),
    React.createElement(
      CollapsibleAdvancedSection,
      {
        title: 'Clients : créances, relances et paiements à vérifier',
        description: 'Le fichier client reste simple. Les contrôles de cohérence sont disponibles ici.',
        open: showAdvanced,
        onToggle: () => setShowAdvanced((value) => !value),
      },
      React.createElement(ClientQualityControl, {
        rows: props.rows || [],
        salesOrders: props.salesOrders || [],
        payments: props.payments || props.paymentsList || [],
        transactions: props.transactions || [],
      })
    )
  );
}
