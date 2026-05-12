import React from 'react';
import ClientsBase from './Clients.jsx';
import ClientQualityControl from './ClientQualityControl.jsx';

export default function Clients(props) {
  return React.createElement(
    'div',
    { className: 'space-y-6' },
    React.createElement(ClientsBase, props),
    React.createElement(ClientQualityControl, {
      rows: props.rows || [],
      salesOrders: props.salesOrders || [],
      payments: props.payments || props.paymentsList || [],
      transactions: props.transactions || [],
    })
  );
}
