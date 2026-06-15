import { QrCode, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { generateSequentialId } from '../../../utils/ids.js';

const clean = (v) => String(v || '').trim();

function parseQrPayload(raw = '') {
  const text = clean(raw);
  if (!text) return null;

  if (text.startsWith('{')) {
    try {
      const json = JSON.parse(text);
      return {
        id: clean(json.id || json.device_id),
        name: clean(json.name || json.label),
        type: clean(json.type || json.sensor_type || 'temperature'),
        zone: clean(json.zone || json.location),
        protocol: clean(json.protocol || json.link),
      };
    } catch {
      return null;
    }
  }

  if (/^horizon:\/\/smartfarm/i.test(text)) {
    const query = text.split('?')[1] || '';
    const params = new URLSearchParams(query);
    return {
      id: clean(params.get('id') || params.get('device_id')),
      name: clean(params.get('name')),
      type: clean(params.get('type') || 'temperature'),
      zone: clean(params.get('zone')),
      protocol: clean(params.get('protocol')),
    };
  }

  const colonMatch = text.match(/^(SENS|CAM|sensor|camera)[:\-](.+)$/i);
  if (colonMatch) {
    const kind = colonMatch[1].toLowerCase();
    const id = colonMatch[2].trim();
    return {
      id,
      name: kind.startsWith('cam') ? `Caméra ${id}` : `Capteur ${id}`,
      type: kind.startsWith('cam') ? 'RTSP' : 'temperature',
      zone: 'terrain',
      deviceKind: kind.startsWith('cam') ? 'camera' : 'sensor',
    };
  }

  if (/^(SENS|CAM|HF-SEN|HF-CAM)/i.test(text)) {
    const isCamera = /^CAM|HF-CAM/i.test(text);
    return {
      id: text,
      name: isCamera ? `Caméra ${text}` : `Capteur ${text}`,
      type: isCamera ? 'RTSP' : 'temperature',
      zone: 'terrain',
      deviceKind: isCamera ? 'camera' : 'sensor',
    };
  }

  return {
    id: text.replace(/\s+/g, '-').toUpperCase(),
    name: `Sonde ${text}`,
    type: 'temperature',
    zone: 'terrain',
    deviceKind: 'sensor',
  };
}

export default function SmartFarmQrPairingModal({
  open = false,
  onClose,
  sensors = [],
  cameras = [],
  onCreateSensor,
  onCreateCamera,
  onRefreshSensors,
  onRefreshCameras,
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    const parsed = parseQrPayload(code);
    if (!parsed?.id) return toast.error('Code QR invalide — collez le texte scanné');

    setBusy(true);
    try {
      const isCamera = parsed.deviceKind === 'camera' || /^CAM|HF-CAM/i.test(parsed.id);
      if (isCamera) {
        const id = parsed.id || generateSequentialId('camera_devices', cameras);
        await onCreateCamera?.({
          id,
          name: parsed.name || `Caméra ${id}`,
          zone: parsed.zone || 'terrain',
          type: parsed.type || 'IP',
          status: 'online',
          source_type: 'reel',
          module_lie: 'smartfarm',
          notes: parsed.protocol ? `Protocol: ${parsed.protocol}` : 'Appairage QR terrain',
        });
        await onRefreshCameras?.();
        toast.success(`Caméra ${id} appairée`);
      } else {
        const id = parsed.id || generateSequentialId('sensor_devices', sensors);
        await onCreateSensor?.({
          id,
          name: parsed.name || `Capteur ${id}`,
          type: parsed.type || 'temperature',
          zone: parsed.zone || 'terrain',
          status: 'online',
          source_type: 'reel',
          module_lie: 'smartfarm',
          battery_level: 100,
          notes: parsed.protocol ? `Protocol: ${parsed.protocol}` : 'Appairage QR terrain',
        });
        await onRefreshSensors?.();
        toast.success(`Capteur ${id} appairé`);
      }
      setCode('');
      onClose?.();
    } catch (e) {
      toast.error(e.message || 'Appairage impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#d6c3a0] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
              <QrCode size={20} /> Appairage QR terrain
            </p>
            <p className="mt-1 text-sm text-[#8a7456]">
              Scannez le QR sur la sonde avec votre téléphone, puis collez le code ici.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-[#eadcc2] p-2 text-[#8a7456]">
            <X size={16} />
          </button>
        </div>
        <label className="mt-4 block text-sm">
          <span className="text-[#8a7456]">Code scanné</span>
          <textarea
            className="mt-1 w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm font-mono"
            rows={4}
            placeholder="SENS:HF-SEN-042 ou horizon://smartfarm/device?id=..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            {busy ? 'Appairage…' : 'Enregistrer l’objet'}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-[#d6c3a0] px-4 py-2 text-xs font-black text-[#2f2415]">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
