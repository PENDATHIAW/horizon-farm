import React, { useState } from 'react';
import CollapsibleAdvancedSection from '../components/CollapsibleAdvancedSection.jsx';
import useCrudModule from '../hooks/useCrudModule';
import FournisseursBase from './Fournisseurs.jsx';
import SupplierQualityControl from './SupplierQualityControl.jsx';

export default function Fournisseurs(props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const financesCrud = useCrudModule('finances');
  const documentsCrud = useCrudModule('documents');
  const stockCrud = useCrudModule('stock');

  return React.createElement(
    'div',
    { className: 'space-y-6' },
    React.createElement(FournisseursBase, props),
    React.createElement(
      CollapsibleAdvancedSection,
      {
        title: 'Fournisseurs : stock, dettes et paiements à vérifier',
        description: 'Le fichier fournisseur reste lisible. Les contrôles avancés sont regroupés ici.',
        open: showAdvanced,
        onToggle: () => setShowAdvanced((value) => !value),
      },
      React.createElement(SupplierQualityControl, {
        rows: props.rows || [],
        stocks: props.stocks?.length ? props.stocks : stockCrud.rows,
        transactions: props.transactions || props.finances || financesCrud.rows,
        documents: props.documents || documentsCrud.rows,
      })
    )
  );
}
