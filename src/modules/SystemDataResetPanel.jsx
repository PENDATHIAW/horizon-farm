import { Download, FileSpreadsheet, Trash2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { validateSystemResetConfirmation } from '../utils/systemAccessWorkflows';

const RESETTABLE_STORAGE_PREFIXES = ['horizon-', 'horizon_'];
const PROTECTED_KEYS = ['horizon_bp', 'business_plan', 'business_plans', 'bp_', 'table_schema', 'schema', 'migration'];
const isProtected = (key = '') => PROTECTED_KEYS.some((token) => key.toLowerCase().includes(token));
const isResettable = (key = '') => RESETTABLE_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix)) && !isProtected(key);
const safeJson = (value) => { try { return JSON.parse(value); } catch { return value; } };
const today = () => new Date().toISOString().slice(0, 10);

function normalizeRows(value) {
  const parsed = safeJson(value);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.rows)) return parsed.rows;
  if (Array.isArray(parsed?.data)) return parsed.data;
  if (parsed && typeof parsed === 'object') return [parsed];
  return [{ value: String(value || '') }];
}
function collectSnapshot() {
  const rows = [];
  const protectedRows = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    const raw = localStorage.getItem(key);
    if (isResettable(key)) rows.push({ key, count: normalizeRows(raw).length, value: raw, normalizedRows: normalizeRows(raw) });
    if (isProtected(key)) protectedRows.push({ key, count: normalizeRows(raw).length });
  }
  return { generated_at: new Date().toISOString(), protected: PROTECTED_KEYS, protectedRows, rows };
}
function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function htmlEscape(value = '') {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
function buildReportHtml(snapshot) {
  const rowsHtml = snapshot.rows.map((row) => `<tr><td>${htmlEscape(row.key)}</td><td>${row.count}</td><td>${htmlEscape(String(row.value || '').slice(0, 800))}</td></tr>`).join('');
  const protectedHtml = snapshot.protectedRows.map((row) => `<tr><td>${htmlEscape(row.key)}</td><td>${row.count}</td><td>Protégé</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Rapport avant effacement Horizon Farm</title><style>body{font-family:Arial,sans-serif;color:#2f2415;margin:28px}h1{font-size:24px}h2{margin-top:26px}table{border-collapse:collapse;width:100%;font-size:12px}th{background:#2f2415;color:white;text-align:left}th,td{border:1px solid #d6c3a0;padding:7px;vertical-align:top}.box{border:1px solid #d6c3a0;background:#fffdf8;border-radius:12px;padding:14px;margin:12px 0}.warn{background:#fff3d8}</style></head><body><h1>Rapport avant effacement — Horizon Farm</h1><div class="box"><b>Date :</b> ${htmlEscape(snapshot.generated_at)}<br/><b>Données effaçables :</b> ${snapshot.rows.length}<br/><b>Données protégées :</b> ${snapshot.protectedRows.length}</div><div class="box warn"><b>Protection :</b> les Business Plans, lignes BP, tables, schémas et migrations ne sont pas supprimés.</div><h2>Données qui seront effacées</h2><table><thead><tr><th>Clé</th><th>Lignes</th><th>Aperçu</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="3">Aucune donnée effaçable.</td></tr>'}</tbody></table><h2>Données protégées</h2><table><thead><tr><th>Clé</th><th>Lignes</th><th>Statut</th></tr></thead><tbody>${protectedHtml || '<tr><td colspan="3">Aucune donnée protégée détectée localement.</td></tr>'}</tbody></table></body></html>`;
}
function buildExcelHtml(snapshot) {
  const sheets = snapshot.rows.map((entry) => {
    const columns = Array.from(new Set(entry.normalizedRows.flatMap((row) => Object.keys(row || {}))));
    const header = columns.map((col) => `<th>${htmlEscape(col)}</th>`).join('') || '<th>value</th>';
    const body = entry.normalizedRows.map((row) => `<tr>${(columns.length ? columns : ['value']).map((col) => `<td>${htmlEscape(typeof row?.[col] === 'object' ? JSON.stringify(row[col]) : row?.[col])}</td>`).join('')}</tr>`).join('');
    return `<h2>${htmlEscape(entry.key)}</h2><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
  }).join('<br/>');
  return `<!doctype html><html><head><meta charset="utf-8"/><style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:4px}th{background:#eee}</style></head><body><h1>Export complet Horizon Farm avant effacement</h1><p>Date : ${htmlEscape(snapshot.generated_at)}</p>${sheets || '<p>Aucune donnée effaçable.</p>'}</body></html>`;
}
function downloadSnapshotReports(snapshot) {
  downloadFile(`rapport-avant-effacement-horizon-farm-${today()}.html`, buildReportHtml(snapshot), 'text/html;charset=utf-8');
  downloadFile(`export-complet-avant-effacement-horizon-farm-${today()}.xls`, buildExcelHtml(snapshot), 'application/vnd.ms-excel;charset=utf-8');
  downloadFile(`sauvegarde-technique-avant-effacement-horizon-farm-${today()}.json`, JSON.stringify(snapshot, null, 2), 'application/json;charset=utf-8');
}
function clearData({ withReport = false, confirmation = '', canManageSystem = false } = {}) {
  const snapshot = collectSnapshot();
  if (!canManageSystem) return toast.error('Seul un Super Admin peut effacer les données de travail');
  if (!validateSystemResetConfirmation(confirmation)) return toast.error('Tape EFFACER pour confirmer cette action sensible');
  const ok = window.confirm(`${snapshot.rows.length} jeu(x) de données de travail seront effacés. Les BP, tables, schémas et migrations restent protégés. Continuer ?`);
  if (!ok) return;
  if (withReport) downloadSnapshotReports(snapshot);
  snapshot.rows.forEach((row) => localStorage.removeItem(row.key));
  toast.success(withReport ? 'Rapports créés puis données effacées' : 'Données effacées sans rapport');
  window.dispatchEvent(new Event('storage'));
}

export default function SystemDataResetPanel({ canManageSystem = false }) {
  const [confirmation, setConfirmation] = useState('');
  const snapshot = typeof window !== 'undefined' ? collectSnapshot() : { rows: [], protectedRows: [] };
  const confirmed = validateSystemResetConfirmation(confirmation) && canManageSystem;
  return <section className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm space-y-4">
    <div>
      <p className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-red-700"><ShieldAlert size={14} /> Zone sensible</p>
      <h3 className="mt-3 text-xl font-black text-[#2f2415]">Effacer les données de travail</h3>
      <p className="mt-1 text-sm text-red-800">Supprime uniquement les données locales de travail. Les Business Plans, structures de tables, schémas et migrations sont exclus.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <button type="button" disabled={!confirmed} onClick={() => clearData({ withReport: false, confirmation, canManageSystem })} className="rounded-2xl border border-red-200 bg-white p-4 text-left hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={18} className="text-red-600" /><b className="block mt-2 text-[#2f2415]">Supprimer sans rapport</b><span className="text-sm text-red-700">Efface les données de travail après confirmation, sans créer d’export.</span></button>
      <button type="button" disabled={!confirmed} onClick={() => clearData({ withReport: true, confirmation, canManageSystem })} className="rounded-2xl border border-red-200 bg-white p-4 text-left hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50"><Download size={18} className="text-red-600" /><b className="block mt-2 text-[#2f2415]">Créer un rapport puis supprimer</b><span className="text-sm text-red-700">Télécharge un rapport lisible, un export Excel et une sauvegarde JSON avant suppression.</span></button>
    </div>
    {!canManageSystem ? <div className="rounded-2xl border border-amber-200 bg-white p-3 text-sm text-amber-800">Lecture seule : seul un Super Admin peut lancer cette action sensible.</div> : null}
    <label className="block rounded-2xl border border-red-200 bg-white p-3 text-sm text-red-800"><span className="font-black">Confirmation obligatoire</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="EFFACER" className="mt-2 w-full rounded-xl border border-red-200 px-3 py-2 text-[#2f2415]" /></label>
    <div className="rounded-2xl border border-red-200 bg-white p-3 text-sm text-red-800"><b>Effaçables :</b> {snapshot.rows.length}. <b>Protégés :</b> {snapshot.protectedRows.length}. BP, lignes BP, structures de tables, schémas et migrations sont exclus.</div>
    <div className="rounded-2xl border border-red-200 bg-white p-3 text-sm text-red-800 flex items-start gap-2"><FileSpreadsheet size={16} className="mt-0.5" /><span>Le fichier Excel est généré au format HTML compatible Excel pour éviter d’ajouter une dépendance lourde. Le JSON reste la sauvegarde technique complète.</span></div>
  </section>;
}
