import React from 'react';
import useCrudModule from '../hooks/useCrudModule';
import FournisseursBase from './Fournisseurs.jsx';
import SupplierQualityControl from './SupplierQualityControl.jsx';

export default function Fournisseurs(props) {
  const financesCrud = useCrudModule('finances');
  const documentsCrud = useCrudModule('documents');
  const stockCrud = useCrudModule('stock');

  return React.createElement(
    'div',
    { className: 'space-y-6' },
    React.createElement(FournisseursBase, props),
    React.createElement(SupplierQualityControl, {
      rows: props.rows || [],
      stocks: props.stocks?.length ? props.stocks : stockCrud.rows,
      transactions: props.transactions || props.finances || financesCrud.rows,
      documents: props.documents || documentsCrud.rows,
    })
  );
}
