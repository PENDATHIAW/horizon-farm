import { CheckCircle2, KeyRound, PlugZap, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';

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

function Step({ done, title, children }) {
  return <div className={`rounded-2xl border p-4 ${done ? 'border-emerald-200 bg-emerald-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="flex items-center gap-2 font-black text-[#2f2415]">{done ? <CheckCircle2 size={17} className="text-emerald-600" /> : <XCircle size={17} className="text-[#c0aa84]" />} {title}</p>
    <div className="mt-2 text-sm text-[#8a7456]">{children}</div>
  </div>;
}

export default function ErpAgentConnectorPanel() {
  const [status, setStatus] = useState(null);
  const [approvalCode, setApprovalCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [dryRunResult, setDryRunResult] = useState(null);

  const checkStatus = async () => {
    try {
      setBusy(true);
      const data = await postAgent({ mode: 'status' });
      setStatus(data);
      toast.success(data.ok ? 'Agent configuré' : 'Agent non configuré');
    } catch (error) {
      setStatus({ ok: false, status: 'error', error: error.message });
      toast.error(error.message || 'Vérification impossible');
    } finally {
      setBusy(false);
    }
  };

  const testApproval = async () => {
    if (!approvalCode.trim()) return toast.error('Code approbation obligatoire');
    try {
      setBusy(true);
      const data = await postAgent({ approvalCode, dryRun: true, lot: 'test_connexion', message: 'ERP agent dry-run connection test' });
      setDryRunResult(data);
      toast.success('Connexion agent validée');
    } catch (error) {
      setDryRunResult({ ok: false, error: error.message });
      toast.error(error.message || 'Test agent impossible');
    } finally {
      setBusy(false);
    }
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5">
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><ShieldCheck size={14} /> Agent sécurisé GitHub / Vercel</p>
        <h2 className="mt-3 text-2xl font-black text-[#2f2415]">Connecter les corrections autonomes contrôlées</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Ce panneau vérifie si l’agent serveur est prêt à modifier GitHub et déclencher Vercel après validation par code secret.</p>
      </div>
      <Btn icon={PlugZap} onClick={checkStatus} disabled={busy}>Vérifier configuration</Btn>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Step done={status?.status === 'configured'} title="Variables Vercel">
        {status ? status.ok ? 'GITHUB_TOKEN et ERP_AGENT_APPROVAL_SECRET sont présents.' : (status.error || 'Variables manquantes côté Vercel.') : 'Clique sur vérifier configuration après avoir ajouté les variables.'}
      </Step>
      <Step done={Boolean(status?.deployHookConfigured)} title="Deploy Hook Vercel">
        {status?.deployHookConfigured ? 'Deploy hook configuré : l’agent pourra relancer un build.' : 'Optionnel mais recommandé pour relancer automatiquement Vercel.'}
      </Step>
      <Step done={Boolean(dryRunResult?.ok)} title="Code approbation">
        {dryRunResult ? dryRunResult.ok ? 'Code validé. L’agent est prêt pour un dry-run.' : dryRunResult.error : 'Teste le code sans modifier GitHub.'}
      </Step>
    </div>

    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
      <label className="block text-sm">
        <span className="font-bold text-[#2f2415]">Code approbation</span>
        <input type="password" value={approvalCode} onChange={(e) => setApprovalCode(e.target.value)} placeholder="ERP_AGENT_APPROVAL_SECRET" className="mt-1 w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Btn icon={KeyRound} onClick={testApproval} disabled={busy}>Tester code sans modifier</Btn>
      </div>
      <p className="text-xs text-[#8a7456]">Le code n’est pas stocké par l’ERP. Il sert seulement à autoriser une correction contrôlée côté serveur.</p>
    </div>

    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <b>Important :</b> la correction autonome réelle sera activée par lot après validation. L’agent refusera les chemins dangereux comme .env, .github ou node_modules, et limitera les corrections à src/, api/ et docs/.
    </div>
  </section>;
}
