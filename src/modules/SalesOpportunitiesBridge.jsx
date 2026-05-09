// Le module Ventes affiche déjà les opportunités dans son onglet dédié.
// Ce bridge reste volontairement neutre pour éviter le double affichage
// "Sources prêtes à vendre" + onglet "Opportunités".
// La logique de conversion doit rester centralisée dans le module Ventes.
export default function SalesOpportunitiesBridge() {
  return null;
}
