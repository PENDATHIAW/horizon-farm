import { AlertTriangle, CheckCircle2, Cloud, GitCommit, RefreshCw } from 'lucide-react';

const RECENT_CORRECTION_COMMITS = [
  '18a15ec323210a6e451a294c8dfc85db111fff21',
  '93e2e35fd7a2e33c9cc612f01b4299789aa18340',
  '192306058cc8027523a3d109ddc6c1ab942f220c',
];

export default function CorrectionDeploymentStatusPanel() {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div>
      <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><Cloud size={14} /> État des corrections</p>
      <h2 className="mt-3 text-2xl font-black text-[#2f2415]">Correction créée, déployée ou visible dans l’ERP ?</h2>
      <p className="mt-1 text-sm text-[#8a7456]">Ce bloc sert à éviter la confusion entre une correction créée dans GitHub et une correction réellement visible après build Vercel.</p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <StatusCard icon={GitCommit} title="GitHub" status="Corrections créées" tone="ok" detail="Les commits existent dans la branche de travail." />
      <StatusCard icon={AlertTriangle} title="Vercel" status="Build à confirmer" tone="warn" detail="Si Vercel affiche upgradeToPro=build-rate-limit, le build n’est pas publié." />
      <StatusCard icon={RefreshCw} title="ERP" status="Visible seulement après build vert" tone="warn" detail="Rafraîchir l’ERP après un déploiement Vercel réussi." />
    </div>

    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <b>Important :</b> si Vercel bloque le build, l’ERP en ligne continue d’afficher l’ancienne version, même si GitHub contient déjà les corrections.
    </div>

    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <p className="font-black text-[#2f2415]">Derniers commits de correction à vérifier</p>
      <div className="mt-3 space-y-2">
        {RECENT_CORRECTION_COMMITS.map((sha) => <div key={sha} className="rounded-xl border border-[#eadcc2] bg-white p-3 text-sm font-mono text-[#2f2415]">{sha}</div>)}
      </div>
      <p className="mt-3 text-xs text-[#8a7456]">Action attendue : vérifier Vercel → Deployments. Si le dernier build est vert, rafraîchir l’ERP puis relancer l’audit.</p>
    </div>
  </section>;
}

function StatusCard({ icon: Icon, title, status, detail, tone = 'ok' }) {
  const classes = tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800';
  return <div className={`rounded-2xl border p-4 ${classes}`}>
    <p className="flex items-center gap-2 text-xs uppercase tracking-wide font-black"><Icon size={14} /> {title}</p>
    <p className="mt-2 text-lg font-black">{status}</p>
    <p className="mt-1 text-sm">{detail}</p>
  </div>;
}
