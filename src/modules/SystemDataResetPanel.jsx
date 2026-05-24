import { Download, Trash2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';

const RESETTABLE_STORAGE_PREFIXES = ['horizon-'];
const PROTECTED_KEYS = ['horizon_bp', 'business_plan', 'bp_', 'table_schema', 'schema', 'migration'];
const isProtected = (key = '') => PROTECTED_KEYS.some((token) => key.toLowerCase().includes(token));
const isResettable = (key = '') => RESETTABLE_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix)) && !isProtected(key);

function collectSnapshot() {
  const rows = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && isResettable(key)) rows.push({ key, value: localStorage.getItem(key) });
  }
  return { generated_at: new Date().toISOString(), protected: PROTECTED_KEYS, rows };
}
function downloadSnapshot(snapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport-avant-effacement-horizon-farm-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function clearData({ withReport = false } = {}) {
  const snapshot = collectSnapshot();
  if (withReport) downloadSnapshot(snapshot);
  snapshot.rows.forEach((row) => localStorage.removeItem(row.key));
  toast.success(withReport ? 'Rapport créé puis données effacées' : 'Données effacées sans rapport');
  window.dispatchEvent(new Event('storage'));
}

export default function SystemDataResetPanel() {
  return <section className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm space-y-4">
    <div>
      <p className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-red-700"><ShieldAlert size={14} /> Zone sensible</p>
      <h3 className="mt-3 text-xl font-black text-[#2f2415]">Effacer les données de travail</h3>
      <p className="mt-1 text-sm text-red-800">Supprime uniquement les données locales de travail. Les Business Plans, structures de tables, schémas et migrations sont exclus.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <button type="button" onClick={() => clearData({ withReport: false })} className="rounded-2xl border border-red-200 bg-white p-4 text-left hover:border-red-400"><Trash2 size={18} className="text-red-600" /><b className="block mt-2 text-[#2f2415]">Supprimer sans rapport</b><span className="text-sm text-red-700">Efface les données de travail immédiatement.</span></button>
      <button type="button" onClick={() => clearData({ withReport: true })} className="rounded-2xl border border-red-200 bg-white p-4 text-left hover:border-red-400"><Download size={18} className="text-red-600" /><b className="block mt-2 text-[#2f2415]">Créer un rapport puis supprimer</b><span className="text-sm text-red-700">Télécharge un fichier JSON de l’existant avant suppression.</span></button>
    </div>
    <div className="rounded-2xl border border-red-200 bg-white p-3 text-sm text-red-800"><b>Protégé :</b> BP, lignes BP, structures de tables, schémas et migrations.</div>
  </section>;
}
