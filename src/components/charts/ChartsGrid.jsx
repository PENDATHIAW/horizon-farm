/** Grille responsive pour l’onglet Graphiques — graphiques uniquement, sans sections KPI. */
export default function ChartsGrid({ children }) {
  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>;
}
