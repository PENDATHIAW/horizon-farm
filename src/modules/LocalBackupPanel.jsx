import { DatabaseBackup, Download, Upload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import {
  exportLocalBackup,
  importLocalBackup,
  parseBackup,
  serializeBackup,
  summarizeBackup,
} from '../services/localBackupService.js';

function currentSummary() {
  try {
    return summarizeBackup(exportLocalBackup());
  } catch {
    return { valid: false, keys: 0, offlineMutations: 0, exportedAt: null };
  }
}

function backupFileName(now = new Date()) {
  return `horizon-farm-sauvegarde-${now.toISOString().slice(0, 19).replaceAll(':', '-')}.json`;
}

/**
 * Sauvegarde et restauration locales (HF-P0-006) : exporte le travail non
 * synchronisé (file hors ligne, formulaires en attente, journaux locaux) dans un
 * fichier, et le restaure sur le même appareil ou un autre. Le serveur reste la
 * sauvegarde de référence des données synchronisées.
 */
export default function LocalBackupPanel() {
  const [summary, setSummary] = useState(currentSummary);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  const refresh = useCallback(() => setSummary(currentSummary()), []);

  const handleExport = useCallback(() => {
    try {
      const backup = exportLocalBackup();
      const blob = new Blob([serializeBackup(backup)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      const info = summarizeBackup(backup);
      setMessage({ tone: 'ok', text: `Sauvegarde créée : ${info.keys} entrées, ${info.offlineMutations} mutation(s) en attente.` });
      refresh();
    } catch {
      setMessage({ tone: 'error', text: 'La sauvegarde n’a pas pu être créée sur cet appareil.' });
    }
  }, [refresh]);

  const handleFile = useCallback((event) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const backup = parseBackup(reader.result);
      if (!backup) {
        setMessage({ tone: 'error', text: 'Fichier de sauvegarde illisible ou d’une version non prise en charge.' });
        return;
      }
      try {
        const result = importLocalBackup(backup, { replace: false });
        setMessage({ tone: 'ok', text: `Restauration effectuée : ${result.restored} entrée(s) restaurées. Rechargez la page pour appliquer.` });
        refresh();
      } catch {
        setMessage({ tone: 'error', text: 'La restauration a été refusée (sauvegarde invalide).' });
      }
    };
    reader.onerror = () => setMessage({ tone: 'error', text: 'Lecture du fichier impossible.' });
    reader.readAsText(file);
  }, [refresh]);

  const toneClass = message?.tone === 'error' ? 'text-urgent' : 'text-positive';

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 font-semibold text-earth">
          <DatabaseBackup size={19} aria-hidden="true" /> Sauvegarde locale
        </h2>
        <p className="mt-1 text-sm text-slate">
          Exportez le travail non encore synchronisé (saisies hors ligne, formulaires et journaux de cet appareil)
          dans un fichier, puis restaurez-le ici en cas de changement d’appareil ou de nettoyage du navigateur.
        </p>
      </div>

      <dl className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-card px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Entrées locales</dt>
          <dd className="mt-1 text-lg font-semibold text-earth">{summary.keys}</dd>
        </div>
        <div className="rounded-xl border border-line bg-card px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Mutations en attente de synchronisation</dt>
          <dd className="mt-1 text-lg font-semibold text-earth">{summary.offlineMutations}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-earth hover:bg-card"
          data-testid="local-backup-export"
        >
          <Download size={15} aria-hidden="true" /> Télécharger une sauvegarde
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-earth hover:bg-card"
          data-testid="local-backup-import"
        >
          <Upload size={15} aria-hidden="true" /> Restaurer depuis un fichier
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {message ? <p className={`mt-4 text-sm font-semibold ${toneClass}`}>{message.text}</p> : null}
      <p className="mt-4 text-xs text-slate">
        Les données déjà synchronisées sont sauvegardées côté serveur ; ce fichier protège uniquement le travail encore local.
      </p>
    </section>
  );
}
