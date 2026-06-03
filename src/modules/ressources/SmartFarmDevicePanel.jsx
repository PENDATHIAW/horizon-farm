import { Radio, WifiOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { commitSmartDeviceOffline } from '../../utils/ressourcesWorkflow.js';

const today = () => new Date().toISOString().slice(0, 10);
const inputCls = 'w-full rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm text-[#2f2415]';
const label = (d = {}) => d.name || d.nom || d.id || 'Appareil';

export default function SmartFarmDevicePanel({
  sensors = [],
  cameras = [],
  context,
  handlers,
  onSuccess,
}) {
  const [kind, setKind] = useState('capteur');
  const list = useMemo(() => (kind === 'camera' ? cameras : sensors), [kind, sensors, cameras]);
  const initial = {
    device_id: list[0]?.id || '',
    reason: '',
    date: today(),
    strategic: true,
  };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      await commitSmartDeviceOffline({
        form: { ...form, kind, status: 'offline' },
        context,
        handlers,
      });
      toast.success('Signal offline enregistré — alerte, tâche et traçabilité');
      setForm(initial);
      await onSuccess?.();
    } catch (err) {
      toast.error(err.message || 'Signalement impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><WifiOff size={20} /> Capteur / caméra offline</p>
        <p className="mt-1 text-sm text-[#8a7456]">Alerte stratégique, tâche de vérification, lien équipement et événement métier.</p>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-5 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Type</span>
          <select className={inputCls} value={kind} onChange={(e) => { setKind(e.target.value); update('device_id', ''); }}>
            <option value="capteur">Capteur</option>
            <option value="camera">Caméra</option>
          </select>
        </label>
        <label className="md:col-span-2 block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Appareil</span>
          <select className={inputCls} value={form.device_id} onChange={(e) => update('device_id', e.target.value)} required>
            <option value="">Choisir</option>
            {list.map((d) => <option key={d.id} value={d.id}>{label(d)} · {d.zone || d.location || '—'}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Date</span>
          <input type="date" className={inputCls} value={form.date} onChange={(e) => update('date', e.target.value)} />
        </label>
        <label className="flex items-end gap-2 text-sm">
          <input type="checkbox" checked={form.strategic} onChange={(e) => update('strategic', e.target.checked)} />
          <span>Alerte stratégique</span>
        </label>
        <label className="md:col-span-4 block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Motif</span>
          <input type="text" className={inputCls} value={form.reason} onChange={(e) => update('reason', e.target.value)} placeholder="Hors ligne, batterie faible…" />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? '…' : 'Signaler'}
          </button>
        </div>
      </form>
      <p className="text-xs text-[#8a7456] flex items-center gap-1"><Radio size={12} /> {list.length} appareil(s) {kind === 'camera' ? 'caméra' : 'capteur'}</p>
    </section>
  );
}
