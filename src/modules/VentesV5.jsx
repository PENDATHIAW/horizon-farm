import { useEffect } from 'react';
import SalesAutoTasksBridge from './SalesAutoTasksBridge.jsx';
import VentesV6 from './VentesV6.jsx';

const replacements = [
  ['CAISSE VENTES', 'VENTES'],
  ['Caisse ventes', 'Ventes'],
  ['Vendre comme dans la vraie vie', 'Enregistrer une vente'],
  ['Une vente = produit + client + paiement + livraison + facture + suivi.', ''],
  ['Nouvelle vente guidée', 'Nouvelle vente'],
  ['Saisir la vente en une seule fois : produit, client, paiement, livraison et facture.', 'Saisir une vente complète.'],
  ['Ventes terrain', 'Nouvelle vente'],
  ['Parcours guidé : produit, client, paiement, livraison/facture puis résumé des impacts ERP.', 'Produit, client, paiement, livraison et facture.'],
  ['Vente terrain guidée', 'Nouvelle vente'],
  ['Une seule saisie crée automatiquement vente, paiement, finance, stock/effectif, facture, document et événement.', 'Renseigne la vente puis valide.'],
  ['Outils de régularisation, données importées et vérifications avancées.', 'Vérifications avancées des ventes.'],
];

function SalesLabelCleaner() {
  useEffect(() => {
    const clean = () => {
      const root = document.querySelector('.commercial-sales-screen');
      if (!root) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        let value = node.nodeValue || '';
        replacements.forEach(([from, to]) => { value = value.replaceAll(from, to); });
        if (value !== node.nodeValue) node.nodeValue = value;
      });
    };
    clean();
    const observer = new MutationObserver(clean);
    const target = document.querySelector('.commercial-sales-screen') || document.body;
    observer.observe(target, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return null;
}

export default function VentesV5(props) {
  return <>
    <SalesAutoTasksBridge
      orders={props.rows || []}
      payments={props.paymentsList || props.payments || []}
      deliveries={props.deliveriesList || props.deliveries || []}
    />
    <div className="commercial-sales-screen">
      <SalesLabelCleaner />
      <VentesV6 {...props} />
    </div>
  </>;
}
