import { CheckCircle2, KeyRound, PackageCheck, Wand2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';

const PACKAGES = [
  ['Lot 0 · Interconnexions globales', 'lot0_interconnexions_globales_v1'],
  ['Lot 1 · Bloquants revenus', 'lot1_bloquants_revenus_v1'],
  ['Lot 2 · Coûts et marges métier', 'lot2_couts_marges_metier_v1'],
  ['Lot 3 · Formulaires et UX', 'lot3_formulaires_ux_v1'],
  ['Lot 4 · Automatisations terrain', 'lot4_automatisations_terrain_v1'],
  ['Lot 5 · Investissements et financeur', 'lot5_investissements_financeur_v1'],
  ['Lot 6 · Fiches métier et suivi', 'lot6_fiches_metier_suivi_v1'],
  ['Lot 7 · Objectifs et décisionnel', 'lot7_objectifs_decisionnel_v1'],
  ['Lot 8 · Traçabilité et documents', 'lot8_tracabilite_documents_v1'],
];

async function postAgent(payload) {
  const response = await fetch('/api/erp-agent/apply-correction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Erreur agent ${response.status}`);
  return data;
}

export default function AuditPackageLauncherPanel() {
  const [approvalCode, setApprovalCode] = useState('');
  const [busyPackage, setBusyPackage] = useState('');
  const [status, setStatus] = useState('');
  const [history, setHistory] = useState([]);

  const run = async (lot, packageId, dryRun = false) => {
    if (!approvalCode.trim()) return toast.error('Code approbation obligatoire');
    try {
      setBusyPackage(`${packageId}-${dryRun ? 'test' : 'apply'}`);
      const data = await postAgent({ approvalCode, lot, packageId, dryRun, message: `ERP agent ${dryRun ? 'dry-run' : 'apply'} - ${lot}` });
      if (dryRun) {
        setStatus(`Test OK pour ${lot}. Paquet reconnu : ${packageId}.`);
        toast.success('Test paquet OK');
      } else {
        const files = Array.isArray(data?.files) ? data.files.length : 0;
        const deploy = data?.deploy ? `Demande Vercel envoyée HTTP ${data.deploy.status}` : 'Hook Vercel non confirmé';
        setStatus(`Paquet appliqué pour ${lot}. ${files} fichier(s) envoyé(s) à GitHub. ${deploy}.`);
        setHistory((items) => [{ lot, packageId, files, status: 'appliqué' }, ...items].slice(0, 10));
        toast.success('Paquet appliqué');
      }
    } catch (error) {
      setStatus(`Erreur ${lot} : ${error.message}`);
      setHistory((items) => [{ lot, packageId, files: 0, status: `erreur: ${error.message}` }, ...items].slice(0, 10));
      toast.error(error.message || 'Action impossible');
    } finally {
      setBusyPackage('');
    }
  };

  const applyAllSafeCorrections = async () => {
    if (!approvalCode.trim()) return toast.error('Code approbation obligatoire');
    try {
      setBusyPackage('all-safe-corrections');
      setStatus('Correction automatique en cours : application des lots sécurisés reconnus.');
      const results = [];
      for (const [lot, packageId] of PACKAGES) {
        // eslint-disable-next-line no-await-in-loop
        const data = await postAgent({ approvalCode, lot, packageId, dryRun: false, message: `ERP agent correction automatique - ${lot}` });
        const files = Array.isArray(data?.files) ? data.files.length : 0;
        results.push({ lot, packageId, files, status: 'appliqué' });
      }
      setHistory(results.reverse());
      setStatus(`${results.length} lot(s) de corrections sécurisées appliqué(s). Rafraîchis l’application puis relance le parcours humain AI.`);
      toast.success('Corrections sécurisées appliquées');
    } catch (error) {
      setStatus(`Correction automatique interrompue : ${error.message}`);
      toast.error(error.message || 'Correction automatique impossible');
    } finally {
      setBusyPackage('');
    }
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div>
      <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><PackageCheck size={14} /> Correction Assistant ERP</p>
      <h2 className="mt-3 text-2xl font-black text-[#2f2415]">Corriger depuis l’interface, sans terminal</h2>
      <p className="mt-1 text-sm text-[#8a7456]">Le bouton principal applique les lots sécurisés reconnus par l’agent. Les boutons par lot restent disponibles si tu veux corriger progressivement.</p>
    </div>

    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <label className="block text-sm">
        <span className="font-bold text-[#2f2415]">Code approbation agent</span>
        <input type="password" value={approvalCode} onChange={(e) => setApprovalCode(e.target.value)} placeholder="ERP_AGENT_APPROVAL_SECRET" className="mt-1 w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2" />
      </label>
      <p className="mt-2 text-xs text-[#8a7456]">Le code n’est pas enregistré. Il autorise seulement l’action serveur sécurisée.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Btn icon={Wand2} onClick={applyAllSafeCorrections} disabled={Boolean(busyPackage)}>{busyPackage === 'all-safe-corrections' ? 'Correction en cours...' : 'Corriger les anomalies nécessaires'}</Btn>
      </div>
    </div>

    {status ? <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800"><b>Statut :</b> {status}</div> : null}

    {history.length ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="font-black text-emerald-800">Historique des corrections</p>
      <div className="mt-3 space-y-2">
        {history.map((item) => <div key={`${item.packageId}-${item.status}`} className="rounded-xl bg-white border border-emerald-100 p-3 text-sm text-emerald-800">
          <b>{item.lot}</b> · {item.status} · {item.files} fichier(s)
        </div>)}
      </div>
    </div> : null}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {PACKAGES.map(([lot, packageId]) => <div key={packageId} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <p className="font-black text-[#2f2415]">{lot}</p>
        <p className="mt-1 text-xs text-[#8a7456]">{packageId}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn icon={KeyRound} small variant="outline" onClick={() => run(lot, packageId, true)} disabled={Boolean(busyPackage)}>{busyPackage === `${packageId}-test` ? 'Test...' : 'Tester paquet'}</Btn>
          <Btn icon={CheckCircle2} small onClick={() => run(lot, packageId, false)} disabled={Boolean(busyPackage)}>{busyPackage === `${packageId}-apply` ? 'Application...' : 'Appliquer ce lot'}</Btn>
        </div>
      </div>)}
    </div>
  </section>;
}
