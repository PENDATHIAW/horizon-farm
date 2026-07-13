import { useEffect, useState } from 'react';
import { Download, FileText, RefreshCcw } from 'lucide-react';
import { readModuleReportExports } from '../utils/moduleReportExports';

function fmtDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return date.toLocaleString('fr-FR');
}

export default function RapportsModuleExportsBridge() {
  const [exportsList, setExportsList] = useState(() => readModuleReportExports());

  const refresh = () => setExportsList(readModuleReportExports());

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('horizon-farm-report-export-created', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('horizon-farm-report-export-created', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const deduped = exportsList.filter((item, index, all) => (
    all.findIndex((candidate) => candidate.module === item.module && candidate.title === item.title && candidate.period === item.period) === index
  ));

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-lg font-semibold text-earth"><FileText size={20} /> Exports PDF des modules</p>
          <p className="mt-1 text-sm text-slate">Les PDF générés depuis les graphes Évolution apparaissent ici, sans créer de doublons visuels avec les rapports programmés.</p>
        </div>
        <button type="button" onClick={refresh} className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth hover:bg-vigilance-bg"><RefreshCcw size={15} /> Actualiser</button>
      </div>

      {deduped.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-normal text-slate">
                <th className="py-2 pr-4">Module</th>
                <th className="py-2 pr-4">Rapport</th>
                <th className="py-2 pr-4">Période</th>
                <th className="py-2 pr-4">Fichier</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {deduped.map((item) => (
                <tr key={`${item.module}-${item.title}-${item.period}`} className="border-b border-line text-earth">
                  <td className="py-3 pr-4 font-semibold">{item.module}</td>
                  <td className="py-3 pr-4">{item.title}</td>
                  <td className="py-3 pr-4">{item.period}</td>
                  <td className="py-3 pr-4"><span className="inline-flex items-center gap-1 rounded-full bg-vigilance-bg px-2 py-1 text-xs font-semibold text-horizon-dark"><Download size={12} /> {item.filename}</span></td>
                  <td className="py-3 pr-4 text-slate">{fmtDate(item.created_at)}</td>
                  <td className="py-3 pr-4"><span className="rounded-full bg-positive-bg px-2 py-1 text-xs font-semibold text-positive">PDF généré</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-line bg-card p-4 text-sm text-slate">
          Aucun export PDF de module pour le moment. Utilise le bouton “Exporter PDF” dans un graphique Évolution pour le faire apparaître ici.
        </div>
      )}
    </section>
  );
}
