import { Camera, Search } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { resolveAnimalScan } from '../../services/animalQrScanService.js';

/**
 * Scan boucle / QR (saisie ou photo fichier) → ouverture fiche.
 */
export default function AnimalScanBar({ animaux = [], onSelectAnimal, label = 'Scan caméra / boucle' }) {
  const [scanValue, setScanValue] = useState('');

  const applyScan = (raw) => {
    const result = resolveAnimalScan(raw, animaux);
    if (!result.found) {
      toast.error('Animal introuvable pour ce scan');
      return;
    }
    onSelectAnimal?.(result.animal, result);
    toast.success(`Fiche ${result.displayName}`);
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const token = text.match(/[A-Z]{2,4}[-_]?\d{2,}/i)?.[0] || scanValue;
      if (token) applyScan(token);
      else toast('Photo enregistrée — saisissez la boucle si le QR n’est pas lu automatiquement.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-3">
      <p className="text-xs font-black uppercase tracking-wide text-sky-900 flex items-center gap-2">
        <Camera size={14} /> {label}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          placeholder="BOV-001 ou scan"
          className="flex-1 min-h-[48px] rounded-xl border border-sky-200 bg-white px-3 text-sm"
        />
        <button type="button" onClick={() => applyScan(scanValue)} className="min-h-[48px] rounded-xl bg-[#2f2415] px-4 text-sm font-black text-white">
          <Search size={14} className="inline mr-1" /> Ouvrir fiche
        </button>
        <label className="min-h-[48px] flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-sky-300 bg-white px-4 text-sm font-bold text-sky-800">
          <Camera size={16} /> Photo
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
      </div>
    </section>
  );
}
